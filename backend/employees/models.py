from django.db import models
from departments.models import Department
# Create your models here.
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
            last = Employee.objects.order_by("-id").first()
            if last is None:
                next_code = 1
            else:
                next_code = last.pk + 1

            self.code = f"EMP-{next_code:04d}"

        super().save(*args, **kwargs)
