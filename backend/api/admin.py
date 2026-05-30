from django.contrib import admin

from .models import Profile, Score


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'avatar', 'total_score', 'games_played')
    search_fields = ('user__username',)


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display = ('user', 'score', 'lines', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username',)
