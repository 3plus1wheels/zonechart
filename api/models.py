from django.conf import settings
from django.db import models

# Create your models here.

class Item(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']


class ThemePreference(models.Model):
    PRESET_CLASSIC = 'classic'
    PRESET_OCEAN = 'ocean'
    PRESET_FOREST = 'forest'
    PRESET_CUSTOM = 'custom'

    PRESET_CHOICES = [
        (PRESET_CLASSIC, 'Classic Ivory'),
        (PRESET_OCEAN, 'Ocean Slate'),
        (PRESET_FOREST, 'Forest Mint'),
        (PRESET_CUSTOM, 'Custom'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='theme_preference')
    preset = models.CharField(max_length=16, choices=PRESET_CHOICES, default=PRESET_CLASSIC)

    color_primary = models.CharField(max_length=7, default='#0d0d12')
    color_accent = models.CharField(max_length=7, default='#c9a84c')
    color_background = models.CharField(max_length=7, default='#faf8f5')
    color_surface = models.CharField(max_length=7, default='#f2eee7')
    color_card = models.CharField(max_length=7, default='#fffcf7')
    color_text = models.CharField(max_length=7, default='#2a2a35')
    color_muted = models.CharField(max_length=7, default='#6c6c78')

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} theme ({self.preset})"
