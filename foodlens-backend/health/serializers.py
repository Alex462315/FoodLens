"""
Health app — Serializers with nested writable conditions and allergies.

The API accepts/returns conditions and allergies as flat string lists:
    "conditions": ["Diabetes", "Hypertension"]
    "allergies": ["Peanuts", "Gluten"]

Internally, these are stored as related rows in HealthCondition and
Allergy tables. The translation happens inside create() and update().
"""
from rest_framework import serializers

from .models import HealthProfile, HealthCondition, Allergy


class HealthProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for HealthProfile with nested writable conditions/allergies.
    Accepts and returns simple string lists for conditions and allergies.
    """
    conditions = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
        help_text='List of condition names, e.g. ["Diabetes", "Hypertension"]',
    )
    allergies = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        default=list,
        help_text='List of allergen names, e.g. ["Peanuts", "Gluten"]',
    )

    class Meta:
        model = HealthProfile
        fields = [
            'id',
            'profile_name',
            'relation',
            'age',
            'gender',
            'height_cm',
            'weight_kg',
            'conditions',
            'allergies',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_age(self, value):
        """Ensure age is between 1 and 120."""
        if value < 1 or value > 120:
            raise serializers.ValidationError('Age must be between 1 and 120.')
        return value

    def validate_height_cm(self, value):
        """Ensure height is positive if provided."""
        if value is not None and value <= 0:
            raise serializers.ValidationError('Height must be a positive number.')
        return value

    def validate_weight_kg(self, value):
        """Ensure weight is positive if provided."""
        if value is not None and value <= 0:
            raise serializers.ValidationError('Weight must be a positive number.')
        return value

    def create(self, validated_data):
        """
        Create a HealthProfile with its related conditions and allergies.
        Translates flat string lists into related model rows.
        """
        conditions_data = validated_data.pop('conditions', [])
        allergies_data = validated_data.pop('allergies', [])

        profile = HealthProfile.objects.create(**validated_data)

        # Create related condition rows
        for condition_name in conditions_data:
            HealthCondition.objects.create(
                profile=profile,
                condition_name=condition_name,
            )

        # Create related allergy rows
        for allergen_name in allergies_data:
            Allergy.objects.create(
                profile=profile,
                allergen_name=allergen_name,
            )

        return profile

    def update(self, instance, validated_data):
        """
        Update a HealthProfile. For conditions and allergies, clear
        old rows and recreate from the new list (replace strategy).
        """
        conditions_data = validated_data.pop('conditions', None)
        allergies_data = validated_data.pop('allergies', None)

        # Update scalar fields on the profile
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Replace conditions if provided in the request
        if conditions_data is not None:
            instance.conditions.all().delete()
            for condition_name in conditions_data:
                HealthCondition.objects.create(
                    profile=instance,
                    condition_name=condition_name,
                )

        # Replace allergies if provided in the request
        if allergies_data is not None:
            instance.allergies.all().delete()
            for allergen_name in allergies_data:
                Allergy.objects.create(
                    profile=instance,
                    allergen_name=allergen_name,
                )

        return instance

    def to_representation(self, instance):
        """
        Convert related condition/allergy rows back to flat string lists
        for the API response. We build the representation manually for
        conditions/allergies to avoid the ListField trying to serialize
        the related manager.
        """
        ret = {
            'id': instance.id,
            'profile_name': instance.profile_name,
            'relation': instance.relation,
            'age': instance.age,
            'gender': instance.gender,
            'height_cm': instance.height_cm,
            'weight_kg': instance.weight_kg,
            'conditions': list(
                instance.conditions.values_list('condition_name', flat=True)
            ),
            'allergies': list(
                instance.allergies.values_list('allergen_name', flat=True)
            ),
            'created_at': instance.created_at.isoformat() if instance.created_at else None,
            'updated_at': instance.updated_at.isoformat() if instance.updated_at else None,
        }
        return ret
