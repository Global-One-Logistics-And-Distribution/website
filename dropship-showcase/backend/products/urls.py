from django.urls import path
from . import views

urlpatterns = [
    path("", views.product_list, name="product-list"),
    path("top/", views.top_products, name="product-top"),
    path("categories/top/", views.top_categories, name="product-top-categories"),
    path("<int:pk>/", views.product_detail, name="product-detail"),
]
