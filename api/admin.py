from django.contrib import admin
from .models import ThemePreference


@admin.register(ThemePreference)
class ThemePreferenceAdmin(admin.ModelAdmin):
	list_display = ('user', 'preset', 'updated_at')
	search_fields = ('user__username',)
