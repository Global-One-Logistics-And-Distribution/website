import { useEffect, useRef } from "react";

const RAZORPAY_WIDGET_SRC = "https://cdn.razorpay.com/static/widget/payment-button.js";
const RAZORPAY_WIDGET_ID = "pl_Jpb8JcRT3ITKIQ";

export default function RazorpayPaymentButton({ className = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const form = document.createElement("form");
    const script = document.createElement("script");
    script.src = RAZORPAY_WIDGET_SRC;
    script.setAttribute("data-payment_button_id", RAZORPAY_WIDGET_ID);
    script.setAttribute("data-button_text", "Buy Now");
    script.setAttribute("data-button_theme", "brand-color");
    form.appendChild(script);
    containerRef.current.appendChild(form);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}
