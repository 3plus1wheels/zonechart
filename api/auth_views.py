from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from django.contrib.auth.models import User
from .auth_serializers import RegisterSerializer, ThemePreferenceSerializer, UserSerializer
from .models import ThemePreference


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "user": UserSerializer(user).data,
            "message": "User registered successfully!"
        }, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ThemePreferenceView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        preference, _ = ThemePreference.objects.get_or_create(user=request.user)
        serializer = ThemePreferenceSerializer(preference)
        return Response(serializer.data)

    def put(self, request):
        preference, _ = ThemePreference.objects.get_or_create(user=request.user)
        serializer = ThemePreferenceSerializer(preference, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        preference, _ = ThemePreference.objects.get_or_create(user=request.user)
        serializer = ThemePreferenceSerializer(preference, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
