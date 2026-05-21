import json
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import Message, User


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await self.get_authenticated_user()
        self.other_user_id = self.scope["url_route"]["kwargs"]["user_id"]

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.other_user = await self.get_other_user()
        if self.other_user is None or self.other_user.id == self.user.id:
            await self.close(code=4004)
            return

        self.room_group_name = Message.build_room_name(self.user.id, self.other_user.id)
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        payload = json.loads(text_data)
        msg_type = payload.get("message_type", "text")

        # ── WebRTC signaling ───────────────────────────────
        if msg_type in ("call-offer", "call-answer", "ice-candidate", "call-end", "call-reject", "call-request"):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "call.signal",
                    "payload": {**payload, "sender_id": self.user.id},
                },
            )
            return

        # ── Typing indicator ───────────────────────────────
        if msg_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat.typing",
                    "sender_id": self.user.id,
                    "is_typing": payload.get("is_typing", False),
                },
            )
            return

        # ── File messages (saved via REST) ─────────────────
        if msg_type in ("image", "voice"):
            await self.channel_layer.group_send(
                self.room_group_name,
                {"type": "chat.message", "message": payload},
            )
            return

        # ── Text message ───────────────────────────────────
        content = (payload.get("message") or payload.get("content") or "").strip()
        if not content:
            await self.send(text_data=json.dumps({"error": "Message cannot be empty."}))
            return

        message = await self.create_message(content)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat.message",
                "message": {
                    "id": message.id,
                    "content": message.content,
                    "message_type": "text",
                    "sender_id": message.sender_id,
                    "sender_username": message.sender.username,
                    "receiver_id": message.receiver_id,
                    "created_at": message.created_at.isoformat(),
                },
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps({
            "message_type": "typing",
            "sender_id": event["sender_id"],
            "is_typing": event["is_typing"],
        }))

    async def call_signal(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    @database_sync_to_async
    def get_other_user(self):
        return User.objects.filter(id=self.other_user_id).first()

    @database_sync_to_async
    def get_authenticated_user(self):
        query_string = self.scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        if not token:
            return AnonymousUser()
        jwt_auth = JWTAuthentication()
        try:
            validated_token = jwt_auth.get_validated_token(token)
            return jwt_auth.get_user(validated_token)
        except (InvalidToken, TokenError):
            return AnonymousUser()

    @database_sync_to_async
    def create_message(self, content):
        message = Message.objects.create(
            sender=self.user,
            receiver=self.other_user,
            content=content,
        )
        return Message.objects.select_related("sender", "receiver").get(id=message.id)
