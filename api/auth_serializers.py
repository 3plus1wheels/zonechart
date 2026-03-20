from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import ThemePreference


class ThemePreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThemePreference
        fields = (
            'preset',
            'color_primary',
            'color_accent',
            'color_background',
            'color_surface',
            'color_card',
            'color_text',
            'color_muted',
            'updated_at',
        )
        read_only_fields = ('updated_at',)

    def validate(self, attrs):
        hex_fields = [
            'color_primary',
            'color_accent',
            'color_background',
            'color_surface',
            'color_card',
            'color_text',
            'color_muted',
        ]

        for field_name in hex_fields:
            if field_name in attrs:
                value = attrs[field_name]
                if not isinstance(value, str) or len(value) != 7 or not value.startswith('#'):
                    raise serializers.ValidationError({field_name: 'Must be a hex color in #RRGGBB format.'})

                hex_part = value[1:]
                try:
                    int(hex_part, 16)
                except ValueError as exc:
                    raise serializers.ValidationError({field_name: 'Must be a valid hex color.'}) from exc

                attrs[field_name] = value.lower()

        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'email': {'required': False}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    theme_preference = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'theme_preference')

    def get_theme_preference(self, obj):
        pref, _ = ThemePreference.objects.get_or_create(user=obj)
        return ThemePreferenceSerializer(pref).data
