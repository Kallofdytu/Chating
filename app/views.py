from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView as BaseTokenView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.shortcuts import get_object_or_404

from .models import Message, User
from .serializers import MessageSerializer, MessageCreateSerializer, UserSerializer


# ── Custom JWT ────────────────────────────────────────────────
class MyTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user_id']  = self.user.id
        data['username'] = self.user.username
        return data

class MyTokenObtainPairView(BaseTokenView):
    serializer_class = MyTokenSerializer


# ── REST API ──────────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.exclude(id=self.request.user.id)


class ConversationView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        other_id = self.kwargs["user_id"]
        me = self.request.user
        return Message.objects.filter(
            sender__in=[me.id, other_id],
            receiver__in=[me.id, other_id],
        ).select_related("sender", "receiver")


class UploadFileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, user_id):
        other = get_object_or_404(User, id=user_id)
        file = request.FILES.get("file")
        message_type = request.data.get("message_type", "image")

        if not file:
            return Response({"error": "No file provided."}, status=400)

        message = Message.objects.create(
            sender=request.user,
            receiver=other,
            content="",
            message_type=message_type,
            file=file,
        )
        return Response({
            "id": message.id,
            "content": "",
            "message_type": message_type,
            "file_url": request.build_absolute_uri(message.file.url),
            "sender_id": message.sender_id,
            "sender_username": message.sender.username,
            "receiver_id": message.receiver_id,
            "created_at": message.created_at.isoformat(),
        }, status=201)
