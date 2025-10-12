export interface KiboNotification {
  eventId: string
  topic: string
  entityId: string
  timestamp: string
  correlationId: string
  isTest: boolean
  extendedProperties?: Array<{
    key: string
    value: string
  }>
}

export const KiboOrderStatus = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  VALIDATED: 'Validated',
  PENDING_REVIEW: 'Pending Review',
  PENDING_SHIPMENT: 'Pending Shipment',
  ACCEPTED: 'Accepted',
  PROCESSING: 'Processing',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  ERRORED: 'Errored',
  ABANDONED: 'Abandoned',
} as const

export const KiboReturnOrderStatus = {
  CREATED: 'Created',
  RETURN_AUTHORIZED: 'ReturnAuthorized',
  RETURN_PENDING: 'ReturnPending',
  RETURN_RECEIVED: 'ReturnReceived',
  REPLACEMENT_SHIPPED: 'ReplacementShipped',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
} as const

export const KiboReturnStatus = {
  RETURN_CANCELLED: 'Cancelled',
  RETURN_CREATED: 'Created',
  RETURN_CLOSED: 'Closed',
  RETURN_REJECTED: 'Rejected',
  RETURN_AUTHORIZED: 'Authorized',
} as const

export const KiboReturnTopics = {
  RETURN_CANCELLED: 'return.cancelled',
  RETURN_OPENED: 'return.opened',
  RETURN_CLOSED: 'return.closed',
  RETURN_REJECTED: 'return.rejected',
  RETURN_AUTHORIZED: 'return.authorized',
  RETURN_UPDATED: 'return.updated',
} as const

export const KiboReturnOrderActions = {
  AWAIT: 'Await',
  RECEIVE: 'Receive',
  REFUND: 'Refund',
  SHIP: 'Ship',
  CLOSE: 'Close',
  CANCEL: 'Cancel',
  REJECT: 'Reject',
  AUTHORIZE: 'Authorize',
} as const

export type KiboOrderStatus = typeof KiboOrderStatus[keyof typeof KiboOrderStatus]

export interface KiboOrder {
  externalId: string
  status: KiboOrderStatus
  items: KiboOrderItem[]
  orderNumber: string
  id: string
  total: number
}

export interface KiboOrderItem {
  id: string
  lineId: number
  fulfillmentMethod: string
  isReservationEnabled: boolean
  priceMode: string
  quantity: number
  product: {
    productCode: string
    imageUrl: string
    name: string
  }
  unitPrice: { price: number }
  subtotal: number
  extendedTotal: number
  taxableTotal: number
  discountTotal: number
  discountedTotal: number
  itemTaxTotal: number
  shippingTotal: number
  feeTotal: number
  total: number
  productDiscounts: any[]
  shippingDiscounts: any[]
  auditInfo: any
  shippingAmountBeforeDiscountsAndAdjustments: number
  weightedOrderAdjustment: number
  adjustedLineItemSubtotal: number
  totalWithoutWeightedShippingAndHandling: number
  weightedOrderTax: number
  weightedOrderShipping: number
  weightedOrderShippingManualAdjustment: number
  weightedOrderShippingTax: number
  weightedOrderHandlingFee: number
  weightedOrderDuty: number
  totalWithWeightedShippingAndHandling: number
  weightedOrderHandlingAdjustment: number
  isAssemblyRequired: boolean
}

export interface KiboShipmentItem {
  lineId: number
  originalOrderItemId: string
  goodsType: string
  productCode: string
  quantity: number
  transferQuantity: number
  name: string
  partNumber: string
  upc: string
  allowsBackOrder: boolean
  unitPrice: number
  isTaxable: boolean
  actualPrice: number
  itemDiscount: number
  lineItemCost: number
  itemTax: number
  shipping: number
  shippingDiscount: number
  shippingTax: number
  handling: number
  handlingDiscount: number
  handlingTax: number
  duty: number
  weightedShipmentAdjustment: number
  weightedLineItemTaxAdjustment: number
  weightedShippingAdjustment: number
  weightedShippingTaxAdjustment: number
  weightedHandlingAdjustment: number
  weightedHandlingTaxAdjustment: number
  weightedDutyAdjustment: number
  taxableShipping: number
  taxableLineItemCost: number
  taxableHandling: number
  weight: number
  length: number
  width: number
  height: number
  weightUnit: string
  auditInfo: {
    updateDate: string
    createDate: string
    updateBy: string
    createBy: string
  }
  options: any[]
  manageStock: boolean
  creditValue: number
  isAssemblyRequired: boolean
  isPackagedStandAlone: boolean
  allowsFutureAllocate: boolean
  inventoryTags: any[]
  isReservedInventory: boolean
  allowsSubstitution: boolean
  originalQuantity: number
  priceMode: string
  shipmentNumber: number
}

export interface KiboPackingSlipItemDetail {
  lineId: number
  quantity: number
}

export interface KiboPackageTracking {
  number: string
  url?: string
}

export interface KiboShipmentPackage {
  packageId: string
  carrier: string
  trackingNumbers: string[]
  returnTrackingNumbers: string[]
  trackings: KiboPackageTracking[]
  packingSlipNumber: number
  packingSlipItemDetails: KiboPackingSlipItemDetail[]
  auditInfo: KiboAuditInfo
  attributes: KiboShipmentPackageAttributes
}

export interface KiboShipmentPackageAttributes {
  routeNumber: string
  trackingURL: string
}

export interface KiboShipment {
  shipmentNumber: number
  orderId: string
  orderNumber: number
  orderSubmitDate: string
  externalOrderId: string
  customerAccountId: number
  tenantId: number
  siteId: number
  shipmentType: string
  shipmentStatus: string
  workflowProcessId: string
  workflowProcessContainerId: string
  shipmentAdjustment: number
  lineItemSubtotal: number
  lineItemTaxAdjustment: number
  lineItemTaxTotal: number
  lineItemTotal: number
  shippingAdjustment: number
  shippingSubtotal: number
  shippingTaxAdjustment: number
  shippingTaxTotal: number
  shippingTotal: number
  handlingAdjustment: number
  handlingSubtotal: number
  handlingTaxAdjustment: number
  handlingTaxTotal: number
  handlingTotal: number
  dutyAdjustment: number
  dutyTotal: number
  total: number
  currencyCode: string
  fulfillmentLocationCode: string
  destination: Record<string, any>
  customer: Record<string, any>
  shippingMethodCode: string
  items: KiboShipmentItem[]
  canceledItems: any[]
  reassignedItems: any[]
  rejectedItems: any[]
  transferredItems: any[]
  packages: KiboShipmentPackage[]
  workflowState: Record<string, any>
  changeMessages: any[]
  email: string
  isExpress: boolean
  auditInfo: Record<string, any>
  readyToCapture: boolean
  isOptInForSms: boolean
  shopperNotes: Record<string, any>
  shipmentNotes: any[]
  isHistoricalImport: boolean
  substitutedItems: any[]
  orderType: string
  workflowProcessVersion: string
  isFlatRateShipping: boolean
  slas: any[]
}

interface ReturnReason {
  reason: string
  quantity: number
}

interface ReturnProduct {
  productCode: string
}

interface ReturnOrderItem {
  orderLineId: number
  product: ReturnProduct
  reasons: ReturnReason[]
  returnNotRequired: boolean
  quantityRefunded: number
  quantityReceived: number
  quantityShipped: number
  quantityRestockable: number
  quantityRestocked: number
  shipmentItemId: number
  shipmentNumber: number
}

export interface ReturnOrder {
  originalOrderId: string
  items: ReturnOrderItem[]
  returnType: string
  locationCode: string
  externalId: string
}

interface KiboPhoneNumbers {
  home?: string
  mobile?: string
  work?: string
}

interface KiboAddress {
  address1: string
  address2?: string
  address3?: string
  address4?: string
  cityOrTown: string
  stateOrProvince: string
  postalOrZipCode: string
  countryCode: string
  addressType?: string
  isValidated?: boolean
}

interface KiboContact {
  id?: number
  email?: string
  firstName?: string
  middleNameOrInitial?: string
  lastNameOrSurname?: string
  companyOrOrganization?: string
  phoneNumbers?: KiboPhoneNumbers
  address?: KiboAddress
}

interface KiboAuditInfo {
  updateDate: string
  createDate: string
  updateBy?: string
  createBy?: string
}

interface KiboNote {
  id: string
  text: string
  auditInfo: KiboAuditInfo
}

interface KiboMeasurement {
  unit: string
  value: number
}

interface KiboMeasurements {
  height?: KiboMeasurement
  width?: KiboMeasurement
  length?: KiboMeasurement
  weight?: KiboMeasurement
}

interface KiboProductOption {
  name: string
  attributeFQN: string
  dataType: string
  stringValue: string
}

interface KiboProductPropertyValue {
  stringValue: string
}

interface KiboProductProperty {
  attributeFQN: string
  name: string
  dataType: string
  isMultiValue: boolean
  values: KiboProductPropertyValue[]
}

interface KiboCategory {
  id: number
  parent?: Record<string, unknown>
}

interface KiboProductPrice {
  price: number
  salePrice?: number
  tenantOverridePrice?: number
  msrp?: number
  creditValue?: number
  priceListCode?: string
  priceListEntryMode?: string
  isOverRidePriceSalePrice?: boolean
}

interface KiboFutureInventory {
  futureInventoryID: number
  onhand: number
  available: number
  allocated: number
  pending: number
  deliveryDate: string
  createDate: string
}

interface KiboStock {
  manageStock: boolean
  isOnBackOrder: boolean
  availableDate?: string
  stockAvailable: number
  aggregateInventory: number
  futureInventories: KiboFutureInventory[]
  availableFutureInventories: number
  totalAvailableStock: number
  isSubstitutable: boolean
}

interface KiboBundledProduct {
  quantity: number
  optionAttributeFQN?: string
  creditValue?: number
  deltaPrice?: number
  imageUrl?: string
  productCode: string
  name: string
  description?: string
  goodsType?: string
  isPackagedStandAlone?: boolean
  stock?: KiboStock
  productReservationId?: number
  allocationId?: number
  allocationExpiration?: string
  measurements?: KiboMeasurements
  fulfillmentStatus?: string
}

interface KiboFulfillmentField {
  name: string
  required: boolean
}

interface KiboProduct {
  mfgPartNumber?: string
  upc?: string
  sku?: string
  fulfillmentTypesSupported?: string[]
  imageAlternateText?: string
  imageUrl?: string
  variationProductCode?: string
  options?: KiboProductOption[]
  properties?: KiboProductProperty[]
  categories?: KiboCategory[]
  price?: KiboProductPrice
  discountsRestricted?: boolean
  discountsRestrictedStartDate?: string
  discountsRestrictedEndDate?: string
  isRecurring?: boolean
  isTaxable?: boolean
  productType?: string
  productUsage?: string
  serialNumber?: string
  condition?: string
  bundledProducts?: KiboBundledProduct[]
  fulfillmentFields?: KiboFulfillmentField[]
  productCode: string
  name: string
  description?: string
  goodsType?: string
  isPackagedStandAlone?: boolean
  stock?: KiboStock
  productReservationId?: number
  allocationId?: number
  allocationExpiration?: string
  measurements?: KiboMeasurements
  fulfillmentStatus?: string
}

interface KiboReturnItem {
  id: string
  orderItemId: string
  orderLineId: number
  orderItemOptionAttributeFQN?: string
  product: KiboProduct
  reasons: ReturnReason[]
  excludeProductExtras?: boolean
  returnType?: string
  returnNotRequired: boolean
  quantityReceived: number
  receiveStatus?: string
  quantityShipped: number
  replaceStatus?: string
  quantityRestockable: number
  quantityRestocked: number
  refundAmount: number
  returnProcessingFeeApplied?: number
  shippingAndHandlingRefunded?: boolean
  quantityRefunded: number
  refundStatus?: string
  quantityReplaced: number
  notes?: KiboNote[]
  productLossAmount?: number
  productLossTaxAmount?: number
  shippingLossAmount?: number
  shippingLossTaxAmount?: number
  totalWithoutWeightedShippingAndHandling?: number
  totalWithWeightedShippingAndHandling?: number
  shipmentItemId: number
  shipmentNumber: number
  data?: Record<string, unknown>
  inventoryTags?: Array<{
    name: string
    value: string
  }>
}

interface KiboPaymentBillingInfo {
  paymentType: string
  paymentWorkflow: string
  billingContact?: KiboContact
  isSameBillingShippingAddress?: boolean
  card?: {
    paymentServiceCardId?: string
    isUsedRecurring?: boolean
    nameOnCard?: string
    isCardInfoSaved?: boolean
    isTokenized?: boolean
    ccLastFour?: string
    paymentOrCardType?: string
    cardNumberPartOrMask?: string
    expireMonth?: number
    expireYear?: number
    bin?: string
  }
  token?: {
    paymentServiceTokenId?: string
    type?: string
  }
  purchaseOrder?: {
    purchaseOrderNumber?: string
    paymentTerm?: {
      code?: string
      description?: string
    }
    customFields?: Array<{
      code?: string
      label?: string
      value?: string
    }>
  }
  check?: {
    checkNumber?: string
  }
  auditInfo?: KiboAuditInfo
  storeCreditCode?: string
  storeCreditType?: string
  customCreditType?: string
  externalTransactionId?: string
  isRecurring?: boolean
  recurringTransactionId?: string
  data?: Record<string, unknown>
}

interface KiboPayment {
  id: string
  groupId?: {
    targetType?: string
    targetId?: string
    targetNumber?: number
  }
  paymentServiceTransactionId?: string
  availableActions?: string[]
  orderId?: string
  paymentType: string
  paymentWorkflow: string
  externalTransactionId?: string
  billingInfo: KiboPaymentBillingInfo
  data?: Record<string, unknown>
  status?: string
  subPayments?: Array<{
    status?: string
    amountCollected: number
    amountCredited: number
    amountRequested: number
    amountRefunded: number
    target?: {
      targetType?: string
      targetId?: string
      targetNumber?: number
    }
  }>
  interactions?: Array<{
    id?: string
    gatewayInteractionId?: number
    paymentId?: string
    orderId?: string
    target?: {
      targetType?: string
      targetId?: string
      targetNumber?: number
    }
    currencyCode?: string
    interactionType?: string
    checkNumber?: string
    status?: string
    paymentEntryStatus?: string
    isRecurring?: boolean
    isManual?: boolean
    isPending?: boolean
    gatewayTransactionId?: string
    gatewayAuthCode?: string
    gatewayAVSCodes?: string
    gatewayCVV2Codes?: string
    gatewayResponseCode?: string
    gatewayResponseText?: string
    gatewayResponseData?: Array<{
      key?: string
      value?: string
    }>
    paymentTransactionInteractionIdReference?: number
    amount: number
    note?: string
    interactionDate: string
    auditInfo?: KiboAuditInfo
    returnId?: string
    refundId?: string
    capturableShipmentsSummary?: Array<{
      shipmentNumber: number
      shipmentTotal: number
      amountApplied: number
    }>
  }>
  isRecurring?: boolean
  amountCollected: number
  amountCredited: number
  amountRequested: number
  changeMessages?: Array<{
    id?: string
    correlationId?: string
    userId?: string
    userFirstName?: string
    userLastName?: string
    userScopeType?: string
    appId?: string
    appKey?: string
    appName?: string
    subjectType?: string
    success: boolean
    identifier?: string
    subject?: string
    verb?: string
    message?: string
    createDate: string
    attributes?: Record<string, unknown>
  }>
  auditInfo?: KiboAuditInfo
  gatewayGiftCard?: {
    id?: string
    cardNumber?: string
    cardPin?: string
    amount: number
    currencyCode?: string
  }
  installmentPlanCode?: string
}

interface KiboPackageItem {
  productCode: string
  quantity: number
  fulfillmentItemType?: string
  lineId: number
  optionAttributeFQN?: string
}

interface KiboPackage {
  shippingMethodCode?: string
  shippingMethodName?: string
  shipmentId?: string
  trackingNumber?: string
  trackingNumbers?: string[]
  packagingType?: string
  hasLabel?: boolean
  measurements?: KiboMeasurements
  carrier?: string
  signatureRequired?: boolean
  trackings?: Array<{
    attributes?: Record<string, unknown>
    number?: string
    url?: string
  }>
  packingSlipItemDetails?: Array<{
    attributes?: Record<string, unknown>
    lineId: number
    originalOrderItemId?: string
    quantity: number
  }>
  packingSlipNumber?: number
  returnTrackings?: Array<{
    attributes?: Record<string, unknown>
    number?: string
    url?: string
  }>
  returnTrackingNumbers?: string[]
  returnCarrier?: string
  packageId?: string
  manifestId?: string
  labelFormat?: string
  integratorId?: string
  fxcbPackNotificationId?: string
  fxcbDocumentsUrl?: string
  attributes?: Record<string, unknown>
  id?: string
  code?: string
  status?: string
  items?: KiboPackageItem[]
  fulfillmentDate?: string
  fulfillmentLocationCode?: string
  auditInfo?: KiboAuditInfo
  availableActions?: string[]
  changeMessages?: Array<{
    id?: string
    correlationId?: string
    userId?: string
    userFirstName?: string
    userLastName?: string
    userScopeType?: string
    appId?: string
    appKey?: string
    appName?: string
    subjectType?: string
    success: boolean
    identifier?: string
    subject?: string
    verb?: string
    message?: string
    createDate: string
    attributes?: Record<string, unknown>
  }>
}

interface KiboChangeMessage {
  id?: string
  correlationId?: string
  userId?: string
  userFirstName?: string
  userLastName?: string
  userScopeType?: string
  appId?: string
  appKey?: string
  appName?: string
  subjectType?: string
  success: boolean
  identifier?: string
  subject?: string
  verb?: string
  message?: string
  createDate: string
  attributes?: Record<string, unknown>
}

export interface KiboReturnResponse {
  startIndex: number
  pageSize: number
  pageCount: number
  totalCount: number
  items: KiboReturnOrder[]
}

export interface KiboReturnOrder {
  id: string
  customerAccountId?: number
  visitId?: string
  webSessionId?: string
  customerInteractionType?: string
  availableActions?: string[]
  returnNumber?: number
  contact?: KiboContact
  locationCode: string
  originalOrderId: string
  originalOrderNumber?: number
  returnOrderId?: string
  currencyCode?: string
  status?: string
  receiveStatus?: string
  refundStatus?: string
  replaceStatus?: string
  items: KiboReturnItem[]
  notes?: KiboNote[]
  rmaDeadline?: string
  returnType: string
  refundAmount: number
  auditInfo: KiboAuditInfo
  payments?: KiboPayment[]
  packages?: KiboPackage[]
  productLossTotal?: number
  shippingLossTotal?: number
  lossTotal?: number
  productLossTaxTotal?: number
  shippingLossTaxTotal?: number
  tenantId?: number
  siteId?: number
  userId?: string
  channelCode?: string
  changeMessages?: KiboChangeMessage[]
  actionRequired?: boolean
  isUnified?: boolean
  canInitiateRefund?: boolean
  refundToGC?: boolean
  shipOrBillCountryCode?: string
  externalId?: string
  overrideReturnRule?: boolean
}

export interface OrderTotals {
  itemsTotal: number
  discountsTotal: number
  shippingTotal: number
  taxTotal: number
}

export interface OrderTotal {
  id: string
  name: string
  value: number
}

export interface KiboAppSettings {
  appCreds: {
    kiboClientId: string
    kiboClientSecretId: string
    grantypeKibo: string
    kiboSiteId: string
    kiboTenantId: string
    kiboURL: string
    kiboShipmentHookSecret?: string
    kiboOrderHookSecret?: string
    kiboReturnsHookSecret?: string
  }
}

export interface KiboTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}
