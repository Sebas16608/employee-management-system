from django.db import models

# Create your models here.
class Department(models.Model):
    code = models.CharField(max_length=200, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["id", "code"]
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"

    def __str__(self) -> str:
        return f"Departamento de {self.name}"
