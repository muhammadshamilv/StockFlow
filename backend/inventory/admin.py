from django.contrib import admin
from .models import Category, Product, InventoryTransaction, Sale

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(InventoryTransaction)
admin.site.register(Sale)