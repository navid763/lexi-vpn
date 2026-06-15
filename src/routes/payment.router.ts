import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";

const paymentRouther = Router();

paymentRouther.post("/", PaymentController.submitPayment);

export default paymentRouther;
