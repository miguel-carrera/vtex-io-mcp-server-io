// Return Request Status
export type Status =
  | 'new'
  | 'processing'
  | 'pickedUpFromClient'
  | 'pendingVerification'
  | 'packageVerified'
  | 'amountRefunded'
  | 'denied'
  | 'cancelled'

export const STATUS = {
  NEW: 'new',
  PROCESSING: 'processing',
  PICKED_UP_FROM_CLIENT: 'pickedUpFromClient',
  PENDING_VERIFICATION: 'pendingVerification',
  PACKAGE_VERIFIED: 'packageVerified',
  AMOUNT_REFUNDED: 'amountRefunded',
  DENIED: 'denied',
  CANCELLED: 'cancelled',
} as const

// Input for a return request comment
export interface ReturnRequestCommentInput {
  value: string
  visibleForCustomer: boolean
}

// Input for an individual refund item
export interface RefundItemInput {
  orderItemIndex: number
  quantity: number
  restockFee: number
}

// Input for refund data associated with a return request
export interface RefundDataInput {
  items: RefundItemInput[]
  refundedShippingValue: number
  refundedAdditionalValue: number
}

// Input for the updateReturnRequestStatus
export interface UpdateReturnRequestStatusInput {
  returnRequestId: string
  status: Status
  comment?: ReturnRequestCommentInput
  refundData?: RefundDataInput
}

export interface ReturnRequestReason {
  reason: string
  otherReason?: string
}

export interface ReturnRequestItem {
  orderItemIndex: number
  quantity: number
  condition: string
  returnReason: ReturnRequestReason
  id: string
  sellingPrice: number
  tax: number
  name: string
  localizedName?: string
  imageUrl: string
  unitMultiplier: number
  sellerId: string
  sellerName: string
  productId: string
  refId: string
}

export interface RefundableAmountTotal {
  id: 'items' | 'shipping' | 'tax' | 'additional'
  value: number
}

export interface CustomerProfileData {
  userId: string
  name: string
  email: string
  phoneNumber: string
}

export interface PickupReturnData {
  addressId: string
  address: string
  city: string
  state: string
  country: string
  zipCode: string
  addressType: 'PICKUP_POINT' | 'CUSTOMER_ADDRESS'
  returnLabel?: string
}

export interface RefundPaymentData {
  refundPaymentMethod: 'bank' | 'card' | 'giftCard' | 'sameAsPurchase'
  iban?: string | null
  accountHolderName?: string | null
  automaticallyRefundPaymentMethod?: boolean | null
}

export interface GiftCard {
  id: string
  redemptionCode: string
}

export interface RefundData {
  invoiceNumber: string
  invoiceValue: number
  refundedItemsValue: number
  refundedShippingValue?: number
  refundedAdditionalValue?: number
  giftCard?: GiftCard
  items: Array<{
    orderItemIndex: number
    id: string
    price: number
    quantity: number
    restockFee: number
  }>
}

export interface RefundStatusComment {
  comment: string
  createdAt: string
  role: 'adminUser' | 'storeUser'
  submittedBy: string
  visibleForCustomer: boolean
}

export interface RefundStatusData {
  status: Status
  submittedBy: string
  createdAt: string
  comments: RefundStatusComment[]
}

export interface CultureInfoData {
  currencyCode: string
  locale: string
}

/**
 * Interface representing a return request
 */
export interface ReturnRequest {
  id: string
  orderId: string
  refundableAmount: number
  sequenceNumber: string
  status: Status
  refundableAmountTotals: RefundableAmountTotal[]
  customerProfileData: CustomerProfileData
  pickupReturnData: PickupReturnData
  refundPaymentData: RefundPaymentData
  items: ReturnRequestItem[]
  dateSubmitted: string
  refundData: RefundData | null
  refundStatusData: RefundStatusData[]
  cultureInfoData: CultureInfoData
  additionalInfo: string
}

/**
 * Interface representing a return request status
 */
export interface ReturnRequestPayload {
  status: Status
  comment?: {
    value: string
    visibleForCustomer: boolean
  }
  refundData?: {
    items: Array<{
      orderItemIndex: number
      quantity: number
      restockFee: number
    }>
    refundedShippingValue?: number
    refundedAdditionalValue?: number
  }
}

/**
 * Interface representing a return reason for an item
 */
export interface ReturnReason {
  reason: string
  quantity: number
}

/**
 * Interface representing a product in a return order
 */
export interface ReturnProduct {
  productCode: string
}
