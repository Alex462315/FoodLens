"""
Health app — Serializers with nested writable conditions and allergies.

The API accepts and returns conditions as objects with severity:
    "conditions": [
        {"condition_name": "Diabetes", "severity": "moderate"}
    ]
    "allergies": ["Peanuts", "Gluten"]

Internally, these are stored as related rows in HealthCondition and
Allergy tables. The translation happens inside create() and update().
"""
from rest_framework import serializers

from .models import HealthProfile, HealthCondition, Allergy


class HealthConditionSerializer(serializers.ModelSerializer):
    """
    Serializer for HealthCondition model.
    """
    class Meta:
        model = HealthCondition
        fields = ['condition_name', 'severity']

    def validate_severity(self, value):
        valid = ['mild', 'moderate', 'severe']
        if value not in valid:
            raise serializers.ValidationError(
                f'Severity must be one of: {", ".join(valid)}.'
            )
        return value


class HealthProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for HealthProfile with nested writable conditions/allergies.
    Accepts/returns condition objects with severity and string lists for allergies.
    """
    conditions = serializers.JSONField(
        required=False,
        default=list,
        help_text='List of condition objects, e.g. [{"condition_name": "Diabetes", "severity": "moderate"}]',
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

    def validate_conditions(self, value):
        """
        Validate list of condition objects (or fallback strings).
        Rejects condition_name values not in the SUPPORTED_CONDITIONS canonical list
        to prevent silent scoring failures from typos or free-text variations.
        """
        # Canonical condition names — must exactly match ConditionMultiplier table keys.
        VALID_CONDITION_NAMES = {
            'Diabetes', 'Hypertension', 'Heart Disease',
            'Obesity', 'Kidney Disease', 'Celiac Disease', 'ADHD',
        }

        if not isinstance(value, list):
            raise serializers.ValidationError('Conditions must be a list.')

        validated = []
        for item in value:
            if isinstance(item, str):
                item_name = item.strip()
                if item_name:
                    if item_name not in VALID_CONDITION_NAMES:
                        raise serializers.ValidationError(
                            f'"{item_name}" is not a recognized condition. '
                            f'Valid options are: {", ".join(sorted(VALID_CONDITION_NAMES))}.'
                        )
                    validated.append({
                        'condition_name': item_name,
                        'severity': 'moderate',
                    })
            elif isinstance(item, dict):
                c_name = item.get('condition_name', '').strip()
                severity = item.get('severity', 'moderate').lower()
                if not c_name:
                    raise serializers.ValidationError('Each condition must have a condition_name.')
                if c_name not in VALID_CONDITION_NAMES:
                    raise serializers.ValidationError(
                        f'"{c_name}" is not a recognized condition. '
                        f'Valid options are: {", ".join(sorted(VALID_CONDITION_NAMES))}.'
                    )
                if severity not in ['mild', 'moderate', 'severe']:
                    raise serializers.ValidationError('Severity must be mild, moderate, or severe.')
                validated.append({
                    'condition_name': c_name,
                    'severity': severity,
                })
            else:
                raise serializers.ValidationError('Condition items must be objects or strings.')

        return validated

    def create(self, validated_data):
        """
        Create a HealthProfile with its related conditions and allergies.
        """
        conditions_data = validated_data.pop('conditions', [])
        allergies_data = validated_data.pop('allergies', [])

        profile = HealthProfile.objects.create(**validated_data)

        # Create related condition rows with severity
        for item in conditions_data:
            HealthCondition.objects.create(
                profile=profile,
                condition_name=item['condition_name'],
                severity=item['severity'],
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
        Update a HealthProfile. Replace strategy for conditions and allergies.
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
            for item in conditions_data:
                HealthCondition.objects.create(
                    profile=instance,
                    condition_name=item['condition_name'],
                    severity=item['severity'],
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
        Convert related condition/allergy rows back to structured representation for API.
        - conditions: list of {"condition_name": ..., "severity": ...}
        - allergies: list of strings
        """
        conditions_rep = [
            {
                'condition_name': c.condition_name,
                'severity': c.severity,
            }
            for c in instance.conditions.all()
        ]

        ret = {
            'id': instance.id,
            'profile_name': instance.profile_name,
            'relation': instance.relation,
            'age': instance.age,
            'gender': instance.gender,
            'height_cm': instance.height_cm,
            'weight_kg': instance.weight_kg,
            'conditions': conditions_rep,
            'allergies': list(
                instance.allergies.values_list('allergen_name', flat=True)
            ),
            'created_at': instance.created_at.isoformat() if instance.created_at else None,
            'updated_at': instance.updated_at.isoformat() if instance.updated_at else None,
        }
        return ret
