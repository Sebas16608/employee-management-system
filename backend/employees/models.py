from django.db import models, transaction
from departments.models import Department
# Create your models here.
class EmployeeSequence(models.Model):
    last_number = models.PositiveIntegerField(default=0)

class Employee(models.Model):
    code = models.CharField(max_length=200, unique=True, editable=False)
    name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    birthdate = models.DateField(blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="employees")

    class Meta:
        ordering = ["id", "code"]
        verbose_name = "Employee"
        verbose_name_plural = "Employees"

    def __str__(self) -> str:
        return f"Employed {self.name}"

    def save(self, *args, **kwargs):
        if not self.code:
            with transaction.atomic():
                sequence, _ = EmployeeSequence.objects.get_or_create(pk=1)
                sequence.last_number += 1
                sequence.save(update_fields=["last_number"])
                self.code = f"EMP-{sequence.last_number:04d}"

                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
