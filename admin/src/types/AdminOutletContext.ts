export interface AdminOutletContext {
  barbershopId: string;
  barbershopName: string;
  paymentsEnabled: boolean;
  loyaltyProgramEnable: boolean;
  loyaltyProgramCount: number;
  isPaymentMandatory: boolean | undefined;
}
