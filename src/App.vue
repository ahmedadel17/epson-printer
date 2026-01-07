<template>
    
    <div class="card">
      <div class="card-header">
        <h5 class="card-title">{{ ('Epson Printer Configuration (HTTPS)') }}</h5>
      </div>
      <div class="card-body">
        <!-- IP Address Input -->
        <div class="form-group mb-3">
          <label for="epsonIpAddress">{{ ('Printer IP Address') }}</label>
          <input
            id="epsonIpAddress"
            v-model="printerIp"
            type="text"
            class="form-control"
            :placeholder="('Enter printer IP address (e.g., 192.168.1.100)')"
            :disabled="isPrinting || isTesting"
          />
          <small class="form-text text-muted">
            {{ ('Enter the IP address of your Epson printer') }}
          </small>
        </div>

        <!-- Port Input -->
        <div class="form-group mb-3">
          <label for="epsonPort">{{ ('Port') }}</label>
          <input
            id="epsonPort"
            v-model.number="printerPort"
            type="number"
            class="form-control"
            placeholder="443"
            :disabled="isPrinting || isTesting"
          />
          <small class="form-text text-muted">
            {{ ('Default port for HTTPS is 443 or 8008') }}
          </small>
        </div>

        <!-- API Path Input -->
        <div class="form-group mb-3">
          <label for="apiPath">{{ ('API Path') }}</label>
          <input
            id="apiPath"
            v-model="apiPath"
            type="text"
            class="form-control"
            placeholder="/cgi-bin/epos/service.cgi"
            :disabled="isPrinting || isTesting"
          />
          <small class="form-text text-muted">
            {{ ('API endpoint path (default: /cgi-bin/epos/service.cgi)') }}
          </small>
        </div>

        <!-- Device ID Input -->
        <div class="form-group mb-3">
          <label for="devid">{{ ('Device ID') }}</label>
          <input
            id="devid"
            v-model="devid"
            type="text"
            class="form-control"
            placeholder="local_print"
            :disabled="isPrinting || isTesting"
          />
          <small class="form-text text-muted">
            {{ ('Device ID parameter (default: local_print)') }}
          </small>
        </div>

        <!-- Authentication (Optional) -->
        <div class="form-group mb-3">
          <div class="form-check">
            <input
              id="useAuth"
              v-model="useAuth"
              type="checkbox"
              class="form-check-input"
              :disabled="isPrinting || isTesting"
            />
            <label class="form-check-label" for="useAuth">
              {{ ('Use Authentication') }}
            </label>
          </div>
        </div>

        <div v-if="useAuth" class="row mb-3">
          <div class="col-md-6">
            <label for="username">{{ ('Username') }}</label>
            <input
              id="username"
              v-model="username"
              type="text"
              class="form-control"
              :disabled="isPrinting || isTesting"
            />
          </div>
          <div class="col-md-6">
            <label for="password">{{ ('Password') }}</label>
            <input
              id="password"
              v-model="password"
              type="password"
              class="form-control"
              :disabled="isPrinting || isTesting"
            />
          </div>
        </div>

        <!-- Ignore SSL Certificate -->
        <div class="form-group mb-3">
          <div class="form-check">
            <input
              id="ignoreSSL"
              v-model="ignoreSSL"
              type="checkbox"
              class="form-check-input"
              :disabled="isPrinting || isTesting"
            />
            <label class="form-check-label" for="ignoreSSL">
              {{ ('Ignore SSL Certificate Errors') }}
            </label>
          </div>
          <small class="form-text text-muted">
            {{ ('Enable this if your printer uses a self-signed certificate') }}
          </small>
        </div>

        <!-- Status Messages -->
        <div v-if="statusMessage" class="alert" :class="statusMessageClass">
          <i :class="statusMessageIcon"></i>
          {{ statusMessage }}
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="alert alert-danger">
          <i class="fas fa-exclamation-triangle"></i>
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          {{ successMessage }}
        </div>

        <!-- Action Buttons -->
        <div class="d-flex gap-2 mt-4 flex-wrap">
          <button
            class="btn btn-info"
            @click="testConnection"
            :disabled="!printerIp || isPrinting || isTesting"
          >
            <i v-if="isTesting" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-network-wired"></i>
            {{ isTesting ? ('Testing...') : ('Test Connection') }}
          </button>

          <button
            class="btn btn-primary"
            @click="printTest"
            :disabled="!printerIp || isPrinting || isTesting"
          >
            <i v-if="isPrinting" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-print"></i>
            {{ isPrinting ? ('Printing...') : ('Print Test') }}
          </button>

          <button
            class="btn btn-success"
            @click="printCustomText"
            :disabled="!printerIp || isPrinting || isTesting"
          >
            <i v-if="isPrinting" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-file-alt"></i>
            {{ isPrinting ? ('Printing...') : ('Print Custom Text') }}
          </button>

          <button
            class="btn btn-warning"
            @click="printReceipt"
            :disabled="!printerIp || isPrinting || isTesting"
          >
            <i v-if="isPrinting" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-receipt"></i>
            {{ isPrinting ? ('Printing...') : ('Print Sample Receipt') }}
          </button>
        </div>

        <!-- Custom Text Input -->
        <div v-if="showCustomText" class="form-group mt-4">
          <label for="customText">{{ ('Custom Text to Print') }}</label>
          <textarea
            id="customText"
            v-model="customText"
            class="form-control"
            rows="5"
            :placeholder="('Enter text to print...')"
            :disabled="isPrinting || isTesting"
          ></textarea>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

import {
  printTextToEpson,
  printReceiptToEpson,
  testEpsonConnection
} from '@/helpers/epsonPrinter'

// Form data
const printerIp = ref('')
const printerPort = ref(443)
const apiPath = ref('/cgi-bin/epos/service.cgi')
const devid = ref('local_print')
const useAuth = ref(false)
const username = ref('')
const password = ref('')
const ignoreSSL = ref(true) // Default to true for local printers with self-signed certs
const customText = ref('')
const showCustomText = ref(false)

// State
const isPrinting = ref(false)
const isTesting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const statusMessage = ref('')

// Computed
const statusMessageClass = computed(() => {
  if (statusMessage.value.includes('Success') || statusMessage.value.includes('Connected')) {
    return 'alert-success'
  }
  if (statusMessage.value.includes('Testing') || statusMessage.value.includes('Printing')) {
    return 'alert-info'
  }
  return 'alert-secondary'
})

const statusMessageIcon = computed(() => {
  if (statusMessage.value.includes('Success') || statusMessage.value.includes('Connected')) {
    return 'fas fa-check-circle'
  }
  if (statusMessage.value.includes('Testing') || statusMessage.value.includes('Printing')) {
    return 'fas fa-spinner fa-spin'
  }
  return 'fas fa-info-circle'
})

// Methods
const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
  statusMessage.value = ''
}

const getPrintOptions = () => {
  return {
    port: printerPort.value,
    apiPath: apiPath.value,
    devid: devid.value,
    ignoreSSL: ignoreSSL.value,
    ...(useAuth.value && username.value && password.value
      ? {
          username: username.value,
          password: password.value
        }
      : {})
  }
}

const testConnection = async () => {
  clearMessages()
  
  if (!printerIp.value) {
    errorMessage.value = 'Please enter a printer IP address'
    return
  }

  if (!printerPort.value || printerPort.value < 1 || printerPort.value > 65535) {
    errorMessage.value = 'Please enter a valid port number (1-65535)'
    return
  }

  isTesting.value = true
  statusMessage.value = 'Testing connection to printer...'

  try {
    const options = getPrintOptions()
    const connected = await testEpsonConnection(printerIp.value, printerPort.value, options)
    
    if (connected) {
      statusMessage.value = `Successfully connected to ${printerIp.value}:${printerPort.value}`
      successMessage.value = 'Printer is reachable!'
    } else {
      errorMessage.value = 'Could not connect to printer. Check IP address and port.'
      statusMessage.value = 'Connection failed'
    }
  } catch (error) {
    errorMessage.value = error.message || 'Failed to test connection'
    statusMessage.value = 'Connection test failed'
  } finally {
    isTesting.value = false
  }
}

const printTest = async () => {
  if (!printerIp.value) {
    errorMessage.value = 'Please enter a printer IP address'
    return
  }

  clearMessages()
  isPrinting.value = true
  statusMessage.value = 'Printing test page...'

  try {
    const options = getPrintOptions()
    const testText = 'Hello World\n\nThis is a test print from Epson HTTPS Printer\n\n'
    
    await printTextToEpson(printerIp.value, printerPort.value, testText, {
      align: 'center',
      doubleWidth: true,
      doubleHeight: true,
      ...options
    })
    
    successMessage.value = 'Test print sent successfully!'
    statusMessage.value = 'Print job completed'
  } catch (error) {
    errorMessage.value = error.message || 'Failed to print'
    statusMessage.value = 'Print failed'
  } finally {
    isPrinting.value = false
  }
}

const printCustomText = () => {
  if (!showCustomText.value) {
    showCustomText.value = true
    return
  }

  if (!customText.value.trim()) {
    errorMessage.value = 'Please enter some text to print'
    return
  }

  printCustomTextToPrinter()
}

const printCustomTextToPrinter = async () => {
  clearMessages()
  isPrinting.value = true
  statusMessage.value = 'Printing custom text...'

  try {
    const options = getPrintOptions()
    await printTextToEpson(printerIp.value, printerPort.value, customText.value, {
      cut: true,
      ...options
    })
    
    successMessage.value = 'Custom text printed successfully!'
    statusMessage.value = 'Print job completed'
    customText.value = ''
    showCustomText.value = false
  } catch (error) {
    errorMessage.value = error.message || 'Failed to print'
    statusMessage.value = 'Print failed'
  } finally {
    isPrinting.value = false
  }
}

const printReceipt = async () => {
  if (!printerIp.value) {
    errorMessage.value = 'Please enter a printer IP address'
    return
  }

  clearMessages()
  isPrinting.value = true
  statusMessage.value = 'Printing sample receipt...'

  try {
    const options = getPrintOptions()
    const receiptData = {
      header: 'Sample Store',
      items: [
        { name: 'Item 1', price: '$10.00' },
        { name: 'Item 2', price: '$15.50' },
        { name: 'Item 3', price: '$8.75' }
      ],
      total: '$34.25',
      footer: 'Thank you for your purchase!'
    }
    
    await printReceiptToEpson(printerIp.value, printerPort.value, receiptData, options)
    
    successMessage.value = 'Sample receipt printed successfully!'
    statusMessage.value = 'Print job completed'
  } catch (error) {
    errorMessage.value = error.message || 'Failed to print receipt'
    statusMessage.value = 'Print failed'
  } finally {
    isPrinting.value = false
  }
}
</script>

<style scoped>
/* Main Card Styling */
.card {
  max-width: 800px;
  margin: 2rem auto;
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;
  background: #ffffff;
}

.card:hover {
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.08);
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1.5rem;
  border-radius: 12px 12px 0 0;
  border-bottom: none;
}

.card-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.card-body {
  padding: 2rem;
  background: #f8f9fa;
}

/* Form Styling */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  display: block;
  font-size: 0.95rem;
}

.form-control {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.form-control:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  outline: none;
}

.form-control:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.7;
}

.form-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  display: block;
}

/* Checkbox Styling */
.form-check {
  margin-bottom: 1rem;
  padding-left: 2rem;
}

.form-check-input {
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.25rem;
  margin-left: -2rem;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.form-check-input:checked {
  background-color: #667eea;
  border-color: #667eea;
}

.form-check-input:focus {
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-check-label {
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}

/* Row Layout */
.row {
  margin-left: -0.5rem;
  margin-right: -0.5rem;
}

.col-md-6 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

/* Alert Styling */
.alert {
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-success {
  background-color: #d1fae5;
  color: #065f46;
}

.alert-danger {
  background-color: #fee2e2;
  color: #991b1b;
}

.alert-info {
  background-color: #dbeafe;
  color: #1e40af;
}

.alert-secondary {
  background-color: #f3f4f6;
  color: #374151;
}

.alert i {
  font-size: 1.1rem;
}

/* Button Styling */
.d-flex {
  display: flex;
}

.gap-2 {
  gap: 0.75rem;
}

.flex-wrap {
  flex-wrap: wrap;
}

.mt-4 {
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: none;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #5568d3 0%, #653a8f 100%);
}

.btn-success {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

.btn-info {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.btn-warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
}

.btn i {
  font-size: 1rem;
}

/* Textarea Styling */
textarea.form-control {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .card {
    margin: 1rem;
    border-radius: 8px;
  }

  .card-body {
    padding: 1.5rem;
  }

  .card-title {
    font-size: 1.25rem;
  }

  .btn {
    flex: 1 1 auto;
    min-width: 140px;
    justify-content: center;
  }

  .d-flex {
    flex-direction: column;
  }

  .gap-2 {
    gap: 0.5rem;
  }
}

/* Loading Spinner Animation */
.fa-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Smooth Transitions */
* {
  transition: background-color 0.2s ease, border-color 0.2s ease;
}
</style>

