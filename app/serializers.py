from rest_framework import serializers
from .models import Message, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "receiver", "content", "created_at"]


class MessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField()

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        return value
