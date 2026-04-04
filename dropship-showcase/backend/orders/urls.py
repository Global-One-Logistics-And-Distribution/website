from django.urls import path
from . import views

urlpatterns = [
    path("", views.order_list, name="order-list"),
    path("<str:order_number>/invoice/", views.order_invoice_download, name="order-invoice-download"),
    path("<str:order_number>/", views.order_detail, name="order-detail"),
]
