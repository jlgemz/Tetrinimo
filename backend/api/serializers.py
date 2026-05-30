from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from .constants import MAX_SCORE
from .models import Profile, Score


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='pk', read_only=True)
    totalScore = serializers.IntegerField(source='profile.total_score', read_only=True)
    gamesPlayed = serializers.IntegerField(source='profile.games_played', read_only=True)
    avatar = serializers.CharField(source='profile.avatar', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'totalScore', 'gamesPlayed', 'avatar']
        read_only_fields = fields

    def to_representation(self, instance):
        Profile.objects.get_or_create(
            user=instance,
            defaults={'avatar': Profile.random_avatar()},
        )
        return super().to_representation(instance)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=1)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Username already exists')
        return value

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
        )
        Profile.objects.create(user=user, avatar=Profile.random_avatar())
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            username=attrs['username'],
            password=attrs['password'],
        )
        if user is None:
            raise serializers.ValidationError('Invalid username or password')
        attrs['user'] = user
        return attrs


class ScoreSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    timestamp = serializers.SerializerMethodField()

    class Meta:
        model = Score
        fields = ['username', 'score', 'lines', 'timestamp']
        read_only_fields = fields

    def get_timestamp(self, obj):
        return int(obj.created_at.timestamp() * 1000)


class ScoreCreateSerializer(serializers.Serializer):
    score = serializers.IntegerField(min_value=0, max_value=MAX_SCORE)
    lines = serializers.IntegerField(min_value=0)

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        profile, _ = Profile.objects.get_or_create(
            user=user,
            defaults={'avatar': Profile.random_avatar()},
        )
        profile.total_score += validated_data['score']
        profile.games_played += 1
        profile.save(update_fields=['total_score', 'games_played'])
        return Score.objects.create(
            user=user,
            score=validated_data['score'],
            lines=validated_data['lines'],
        )
