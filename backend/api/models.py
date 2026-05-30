import random

from django.conf import settings
from django.db import models

from .constants import AVATARS


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    avatar = models.CharField(max_length=8, default='🐼')
    total_score = models.IntegerField(default=0)
    games_played = models.IntegerField(default=0)

    def __str__(self):
        return f'{self.user.username} profile'

    @staticmethod
    def random_avatar():
        return random.choice(AVATARS)


class Score(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scores',
    )
    score = models.IntegerField()
    lines = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score', '-created_at']

    def __str__(self):
        return f'{self.user.username}: {self.score}'
