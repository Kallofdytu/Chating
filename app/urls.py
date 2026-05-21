from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("api/token/",         views.MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(),            name="token_refresh"),
    path("api/users/",         views.UserListView.as_view(),          name="user-list"),
    path("api/messages/<int:user_id>/", views.ConversationView.as_view(), name="conversation"),
    path("api/upload/<int:user_id>/",   views.UploadFileView.as_view(),   name="upload-file"),
]
