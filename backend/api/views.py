from django.conf import settings
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Score
from .serializers import (
    LoginSerializer,
    RegisterSerializer,
    ScoreCreateSerializer,
    ScoreSerializer,
    UserSerializer,
)


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Session auth without CSRF enforcement in DEBUG."""

    def enforce_csrf(self, request):
        if settings.DEBUG:
            return
        return super().enforce_csrf(request)


class CsrfView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({'csrfToken': get_token(request)})


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            message = 'Registration failed'
            for key in ('username', 'password', 'non_field_errors'):
                if key in errors:
                    val = errors[key]
                    message = str(val[0] if isinstance(val, list) else val)
                    break
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid username or password'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        user = serializer.validated_data['user']
        login(request, user)
        return Response(UserSerializer(user).data)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'status': 'ok'})


class MeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        user = request.user
        if user is None or not user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserSerializer(user).data)


@method_decorator(csrf_exempt, name='dispatch')
class ScoreListCreateView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 10)), 100)
        scores = Score.objects.select_related('user').order_by('-score', '-created_at')[:limit]
        return Response(ScoreSerializer(scores, many=True).data)

    def post(self, request):
        serializer = ScoreCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        score = serializer.save()
        return Response(ScoreSerializer(score).data, status=status.HTTP_201_CREATED)


class ScoreRankView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        username = request.query_params.get('username', '').strip()
        if not username:
            return Response({'rank': None})

        scores = Score.objects.select_related('user').order_by('-score', '-created_at')
        for index, score in enumerate(scores):
            if score.user.username == username:
                return Response({'rank': index + 1})
        return Response({'rank': None})
