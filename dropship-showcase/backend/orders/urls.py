from django.urls import path
from . import views

urlpatterns = [
    path("", views.order_list, name="order-list"),
    path("coupons/validate/", views.coupon_validate, name="coupon-validate"),
    path("returns/", views.return_requests, name="return-requests"),
    path("<str:order_number>/invoice/", views.order_invoice_download, name="order-invoice-download"),
    path("<str:order_number>/", views.order_detail, name="order-detail"),
]
