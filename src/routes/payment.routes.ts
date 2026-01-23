import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateJWT);

router.post("/create-order", paymentController.createOrder);
router.post("/verify", paymentController.verifyPayment);

export default router;
