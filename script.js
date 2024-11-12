class InvoiceGenerator {
    constructor() {
        this.logoSrc = '';
        this.initializeEventListeners();
        this.setupTabNavigation();
        this.setupFormValidation();
        this.setupFilePreview();

        // Bind the method to the class instance
        this.calculateTotals = this.calculateTotals.bind(this);
        
        // Add event listeners for discount calculations
        const discountType = document.getElementById('discount-type');
        const discountAmount = document.getElementById('discount-amount');
        
        if (discountType) {
            discountType.addEventListener('change', this.calculateTotals);
        }
        
        if (discountAmount) {
            discountAmount.addEventListener('input', this.calculateTotals);
        }

        // Logo preview setup
        this.logoInput = document.getElementById('logo-upload');
        this.previewContainer = document.querySelector('.file-preview');
        this.removeLogoBtn = document.querySelector('.remove-logo');
        
        if (this.logoInput) {
            this.logoInput.addEventListener('change', (e) => this.handleLogoUpload(e));
        }
        
        if (this.removeLogoBtn) {
            this.removeLogoBtn.addEventListener('click', () => this.removeLogo());
        }

        this.logoDataUrl = null; // Store the logo data URL

        // Preview button setup
        const previewButton = document.getElementById('preview-invoice');
        if (previewButton) {
            previewButton.addEventListener('click', () => this.previewInvoice());
        }

        // Modal close button setup
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closePreview());
        }

        // Initialize tax rate
        this.taxRate = 0.10; // 10% tax rate

        // PDF download button
        const generatePDFButton = document.getElementById('generate-pdf');
        if (generatePDFButton) {
            generatePDFButton.addEventListener('click', () => this.generatePDF());
        }

        this.isGeneratingPDF = false;
    }

    initializeEventListeners() {
        const previewButton = document.getElementById('preview-invoice');
        const generatePdfButton = document.getElementById('generate-pdf');
        const addItemButton = document.getElementById('add-item');

        if (previewButton) {
            previewButton.addEventListener('click', () => this.previewInvoice());
        }

        if (generatePdfButton) {
            generatePdfButton.addEventListener('click', () => this.generatePDF());
        }

        if (addItemButton) {
            addItemButton.addEventListener('click', () => this.addItemRow());
        }
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');

                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to current button and content
                button.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }

    addItemRow() {
        const tbody = document.querySelector('#items-table tbody');
        const newRow = document.createElement('tr');
        newRow.className = 'item-row';
        newRow.innerHTML = `
            <td><input type="text" class="item-desc" required></td>
            <td><input type="number" class="item-qty" min="1" value="1" required></td>
            <td><input type="text" class="item-price" value="0.00" required></td>
            <td class="item-total">$0.00</td>
            <td><button type="button" class="remove-item">×</button></td>
        `;
        tbody.appendChild(newRow);

        // Add event listeners to new row
        this.setupItemRowListeners(newRow);
        this.calculateTotals();
    }

    setupItemRowListeners(row) {
        const qtyInput = row.querySelector('.item-qty');
        const priceInput = row.querySelector('.item-price');
        const removeButton = row.querySelector('.remove-item');

        qtyInput.addEventListener('input', () => this.updateItemTotal(row));
        
        // Price input formatting
        priceInput.addEventListener('input', (e) => {
            const value = e.target.value.replace(/[^\d.]/g, '');
            let formattedValue = this.formatPriceInput(value);
            e.target.value = formattedValue;
            this.updateItemTotal(row);
        });
        removeButton.addEventListener('click', () => {
            row.remove();
            this.calculateTotals();
        });
    }

    formatPriceInput(value) {
        // Remove any non-numeric characters except decimal point
        value = value.replace(/[^\d.]/g, '');
        
        // Remove multiple decimal points, keep only the first one
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }

        // Handle decimal places
        if (value.includes('.')) {
            const [whole, decimal] = value.split('.');
            return `${whole}.${decimal.slice(0, 2)}`;
        }

        return value;
    }

    updateItemTotal(row) {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const total = qty * price;
        row.querySelector('.item-total').textContent = `$${total.toFixed(2)}`;
        this.calculateTotals();
    }

    calculateTotals() {
        const subtotal = this.calculateSubtotal();
        const tax = subtotal * this.taxRate;
        const discount = this.calculateDiscount(subtotal);
        const total = subtotal + tax - discount;

        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('discount').textContent = `$${discount.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;

        console.log({
            subtotal,
            tax,
            discount,
            total,
            items: Array.from(document.querySelectorAll('.item-row')).map(row => ({
                qty: row.querySelector('.item-qty').value,
                price: row.querySelector('.item-price').value,
                total: row.querySelector('.item-total').textContent
            }))
        });
    }

    collectInvoiceData() {
        return {
            logo: this.logoSrc,
            business: {
                name: document.getElementById('business-name').value,
                address: document.getElementById('business-address').value,
                phone: document.getElementById('business-phone').value,
                email: document.getElementById('business-email').value
            },
            client: {
                name: document.getElementById('client-name').value,
                address: document.getElementById('client-address').value,
                phone: document.getElementById('client-phone').value,
                email: document.getElementById('client-email').value
            },
            invoice: {
                number: document.getElementById('invoice-number').value,
                date: document.getElementById('invoice-date').value,
                dueDate: document.getElementById('due-date').value,
                paymentTerms: document.getElementById('payment-terms').value
            },
            items: Array.from(document.querySelectorAll('.item-row')).map(row => ({
                description: row.querySelector('.item-desc').value,
                quantity: row.querySelector('.item-qty').value,
                price: row.querySelector('.item-price').value,
                total: row.querySelector('.item-total').textContent
            })),
            totals: {
                subtotal: document.getElementById('subtotal').textContent,
                tax: document.getElementById('tax').textContent,
                total: document.getElementById('total').textContent
            }
        };
    }

    generateInvoiceHTML(invoiceData) {
        return `
            <div class="modern-invoice-preview">
                <div class="invoice-header">
                    <div class="logo-container">
                        ${invoiceData.logo ? `<img src="${invoiceData.logo}" alt="Company Logo" class="company-logo">` : ''}
                    </div>
                    <div class="invoice-title">
                        <h1>INVOICE</h1>
                        <p class="invoice-number">Invoice #${invoiceData.invoice.number}</p>
                    </div>
                </div>

                <div class="invoice-details-grid">
                    <div class="from-section">
                        <h3>From</h3>
                        <p><strong>${invoiceData.business.name}</strong></p>
                        <p>${invoiceData.business.address}</p>
                        <p>${invoiceData.business.phone}</p>
                        <p>${invoiceData.business.email}</p>
                    </div>
                    <div class="to-section">
                        <h3>Bill To</h3>
                        <p><strong>${invoiceData.client.name}</strong></p>
                        <p>${invoiceData.client.address}</p>
                        <p>${invoiceData.client.phone}</p>
                        <p>${invoiceData.client.email}</p>
                    </div>
                    <div class="invoice-meta">
                        <div class="meta-item">
                            <span>Invoice Date:</span>
                            <p>${invoiceData.invoice.date}</p>
                        </div>
                        <div class="meta-item">
                            <span>Due Date:</span>
                            <p>${invoiceData.invoice.dueDate}</p>
                        </div>
                        <div class="meta-item">
                            <span>Payment Terms:</span>
                            <p>${invoiceData.invoice.paymentTerms}</p>
                        </div>
                    </div>
                </div>

                <table class="invoice-items">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoiceData.items.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td>${item.quantity}</td>
                                <td>$${parseFloat(item.price).toFixed(2)}</td>
                                <td>${item.total}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="invoice-totals">
                    <div class="totals-grid">
                        <div class="totals-label">Subtotal</div>
                        <div class="totals-value">${invoiceData.totals.subtotal}</div>
                        <div class="totals-label">Tax</div>
                        <div class="totals-value">${invoiceData.totals.tax}</div>
                        <div class="totals-label total-label">Total</div>
                        <div class="totals-value total-value">${invoiceData.totals.total}</div>
                    </div>
                </div>
            </div>
        `;
    }

    previewInvoice() {
        this.calculateTotals(); // Ensure totals are up-to-date

        const modal = document.getElementById('preview-modal');
        if (!modal) {
            console.error('Preview modal not found');
            return;
        }

        const previewContent = modal.querySelector('.preview-content');
        if (!previewContent) {
            console.error('Preview content container not found');
            return;
        }

        // Generate preview HTML
        const previewHTML = `
            <div class="preview-header">
                <div class="logo-container">
                    ${this.logoDataUrl ? 
                        `<img src="${this.logoDataUrl}" class="company-logo" alt="Company Logo">` : 
                        ''}
                </div>
                <div class="invoice-title">
                    <h1>INVOICE</h1>
                    <div class="invoice-details">
                        <p>Invoice #: ${document.getElementById('invoice-number')?.value || ''}</p>
                        <p>Date: ${document.getElementById('invoice-date')?.value || ''}</p>
                        <p>Due Date: ${document.getElementById('due-date')?.value || ''}</p>
                    </div>
                </div>
            </div>

            <div class="invoice-details-grid">
                <div class="from-section">
                    <h3>From</h3>
                    <p>${document.getElementById('business-name')?.value || ''}</p>
                    <p>${document.getElementById('business-address')?.value || ''}</p>
                    <p>${document.getElementById('business-phone')?.value || ''}</p>
                    <p>${document.getElementById('business-email')?.value || ''}</p>
                </div>

                <div class="to-section">
                    <h3>Bill To</h3>
                    <p>${document.getElementById('client-name')?.value || ''}</p>
                    <p>${document.getElementById('client-address')?.value || ''}</p>
                    <p>${document.getElementById('client-phone')?.value || ''}</p>
                    <p>${document.getElementById('client-email')?.value || ''}</p>
                </div>
            </div>

            <div class="items-table-container">
                ${this.generateItemsTable()}
            </div>

            <div class="totals-container">
                ${this.generateTotalsHTML()}
            </div>
        `;

        // Update modal content
        previewContent.innerHTML = previewHTML;

        // Show modal
        modal.style.display = 'block';
    }

    closePreview() {
        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    generateItemsTable() {
        const items = document.querySelectorAll('.item-row');
        if (!items || items.length === 0) {
            return '<p>No items added</p>';
        }

        let tableHTML = `
            <table class="invoice-items">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;

        items.forEach(item => {
            const description = item.querySelector('.item-desc').value;
            const quantity = parseFloat(item.querySelector('.item-qty').value) || 0;
            const price = parseFloat(item.querySelector('.item-price').value) || 0;
            const total = quantity * price;

            tableHTML += `
                <tr>
                    <td>${description}</td>
                    <td>${quantity}</td>
                    <td>$${price.toFixed(2)}</td>
                    <td>$${total.toFixed(2)}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        return tableHTML;
    }

    calculateSubtotal() {
        let subtotal = 0;
        const items = document.querySelectorAll('.item-row');
        
        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('.item-qty').value) || 0;
            const price = parseFloat(item.querySelector('.item-price').value.replace('$', '')) || 0;
            subtotal += quantity * price;
        });
        
        return subtotal;
    }

    calculateTax(subtotal) {
        return subtotal * this.taxRate;
    }

    calculateDiscount(subtotal) {
        const discountType = document.getElementById('discount-type')?.value;
        const discountAmount = parseFloat(document.getElementById('discount-amount')?.value) || 0;
        
        if (discountType === 'percentage') {
            return subtotal * (discountAmount / 100);
        }
        return discountAmount;
    }

    generateTotalsHTML() {
        const subtotal = this.calculateSubtotal();
        const tax = this.calculateTax(subtotal);
        const discount = this.calculateDiscount(subtotal);
        const total = subtotal + tax - discount;

        return `
            <div class="totals-grid">
                <div class="totals-label">Subtotal:</div>
                <div class="totals-value">$${subtotal.toFixed(2)}</div>
                <div class="totals-label">Tax (${(this.taxRate * 100).toFixed(0)}%):</div>
                <div class="totals-value">$${tax.toFixed(2)}</div>
                <div class="totals-label">Discount:</div>
                <div class="totals-value">$${discount.toFixed(2)}</div>
                <div class="total-label">Total:</div>
                <div class="total-value">$${total.toFixed(2)}</div>
            </div>
        `;
    }

    async generatePDF() {
        this.calculateTotals(); // Ensure totals are up-to-date

        if (this.isGeneratingPDF) return;
        this.isGeneratingPDF = true;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Colors
            const primaryColor = [44, 62, 80];      // Dark gray
            const textColor = [85, 85, 85];         // Medium gray
            const lightGray = [240, 242, 245];      // Very light gray

            // Dimensions
            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            let yPos = 20;

            // Add logo with proper aspect ratio
            if (this.logoDataUrl) {
                try {
                    const img = new Image();
                    img.src = this.logoDataUrl;
                    
                    const maxWidth = 40;
                    const maxHeight = 20;
                    let width = img.width;
                    let height = img.height;
                    
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                    
                    doc.addImage(this.logoDataUrl, 'PNG', margin, yPos, width, height);
                    yPos += height + 10;
                } catch (error) {
                    console.error('Error adding logo to PDF:', error);
                }
            }

            // Invoice Title and Details
            doc.setTextColor(...primaryColor);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('INVOICE', pageWidth - margin - doc.getTextWidth('INVOICE'), 25);

            yPos = 45;

            // Invoice Details
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...textColor);
            
            const invoiceDetails = [
                `Invoice #: ${document.getElementById('invoice-number')?.value || ''}`,
                `Date: ${document.getElementById('invoice-date')?.value || ''}`,
                `Due Date: ${document.getElementById('due-date')?.value || ''}`
            ];
            
            invoiceDetails.forEach(detail => {
                doc.text(detail, pageWidth - margin - doc.getTextWidth(detail), yPos);
                yPos += 6;
            });

            yPos = 70;

            // Business and Client Information
            const leftColX = margin;
            const rightColX = pageWidth / 2;
            const sectionWidth = (pageWidth - (margin * 2)) / 2 - 10; // Subtract 10 for spacing

            // FROM section
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('FROM', leftColX, yPos);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const fromLines = [
                document.getElementById('business-name').value,
                document.getElementById('business-address').value,
                document.getElementById('business-phone').value,
                document.getElementById('business-email').value
            ];
            
            // Use splitTextToSize to handle line wrapping
            const fromWrapped = doc.splitTextToSize(fromLines.join('\n'), sectionWidth);
            doc.text(fromWrapped, leftColX, yPos + 8);

            // BILL TO section
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('BILL TO', rightColX, yPos);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const billToLines = [
                document.getElementById('client-name').value,
                document.getElementById('client-address').value,
                document.getElementById('client-phone').value,
                document.getElementById('client-email').value
            ];
            
            // Use splitTextToSize to handle line wrapping
            const billToWrapped = doc.splitTextToSize(billToLines.join('\n'), sectionWidth);
            doc.text(billToWrapped, rightColX, yPos + 8);

            // Calculate the maximum height of both sections and adjust yPos
            const fromHeight = fromWrapped.length * 5;
            const billToHeight = billToWrapped.length * 5;
            yPos += Math.max(fromHeight, billToHeight) + 15; // Add padding

            // Items Table
            const items = document.querySelectorAll('.item-row');
            if (items.length > 0) {
                // Table headers
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...primaryColor);
                
                const columns = [
                    { header: 'Description', x: margin, width: contentWidth * 0.4 },
                    { header: 'Quantity', x: margin + (contentWidth * 0.4), width: contentWidth * 0.2 },
                    { header: 'Price', x: margin + (contentWidth * 0.6), width: contentWidth * 0.2 },
                    { header: 'Total', x: margin + (contentWidth * 0.8), width: contentWidth * 0.2 }
                ];

                columns.forEach(col => {
                    doc.text(col.header, col.x, yPos);
                });

                yPos += 8;

                // Table items
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...textColor);
                items.forEach((item, index) => {
                    if (index % 2 === 0) {
                        doc.setFillColor(...lightGray);
                        doc.rect(margin, yPos - 4, contentWidth, 6, 'F');
                    }

                    const description = item.querySelector('.item-desc').value || '';
                    const quantity = item.querySelector('.item-qty').value || '0';
                    const price = parseFloat(item.querySelector('.item-price').value || '0').toFixed(2);
                    const total = (parseFloat(quantity) * parseFloat(price)).toFixed(2);

                    doc.text(description, columns[0].x, yPos);
                    doc.text(quantity.toString(), columns[1].x, yPos);
                    doc.text(`$${price}`, columns[2].x, yPos);
                    doc.text(`$${total}`, columns[3].x, yPos);

                    yPos += 6;
                });
            }

            yPos += 10;

            // Totals section
            const subtotal = this.calculateSubtotal();
            const tax = subtotal * this.taxRate;
            const discount = this.calculateDiscount(subtotal);
            const total = subtotal + tax - discount;

            const totalsX = pageWidth - margin - 80;
            doc.setTextColor(...textColor);
            
            // Align totals right
            const alignTotals = (text, value, y) => {
                doc.text(text, totalsX, y);
                doc.text(`$${value.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
            };

            alignTotals('Subtotal:', subtotal, yPos);
            alignTotals(`Tax (${(this.taxRate * 100)}%):`, tax, yPos + 8);
            alignTotals('Discount:', discount, yPos + 16);

            // Final total
            yPos += 24;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            alignTotals('Total:', total, yPos);

            // Ensure totals are updated before generating PDF
            this.calculateTotals();

            // Save the PDF
            doc.save(`invoice-${document.getElementById('invoice-number')?.value || 'new'}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            this.isGeneratingPDF = false;
        }
    }

    validateForm() {
        const requiredFields = document.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('invalid');
                isValid = false;
            } else {
                field.classList.remove('invalid');
            }
        });

        // Ensure at least one item is added
        const items = document.querySelectorAll('.item-row');
        if (items.length === 0) {
            alert('Please add at least one item to the invoice');
            isValid = false;
        }

        return isValid;
    }

    setupFormValidation() {
        const form = document.getElementById('invoice-form');
        if (!form) {
            console.warn('Form not found');
            return;
        }

        // Get all required fields
        const requiredFields = form.querySelectorAll('[required]');

        requiredFields.forEach(field => {
            // Add event listeners for validation
            field.addEventListener('input', () => this.validateField(field));
            field.addEventListener('blur', () => this.validateField(field));
        });
    }

    validateField(field) {
        // Basic validation logic
        if (field.validity.valueMissing) {
            this.showError(field, 'This field is required');
            return false;
        }

        // Email validation
        if (field.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(field.value)) {
                this.showError(field, 'Please enter a valid email address');
                return false;
            }
        }

        // Phone validation (optional)
        if (field.type === 'tel') {
            const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
            if (!phoneRegex.test(field.value)) {
                this.showError(field, 'Please enter a valid phone number');
                return false;
            }
        }

        // Clear any existing errors
        this.clearError(field);
        return true;
    }

    showError(field, message) {
        // Remove any existing error
        this.clearError(field);

        // Add invalid class
        field.classList.add('invalid');

        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;

        // Insert error message after the field
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }

    clearError(field) {
        // Remove invalid class
        field.classList.remove('invalid');

        // Remove error message if it exists
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    setupFilePreview() {
        const logoInput = document.getElementById('company-logo');
        if (!logoInput) {
            console.warn('Logo input not found');
            return;
        }

        logoInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.logoSrc = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                this.logoDataUrl = e.target.result; // Store the data URL
                
                // Update upload preview
                let previewImg = this.previewContainer.querySelector('img');
                if (!previewImg) {
                    previewImg = document.createElement('img');
                    this.previewContainer.appendChild(previewImg);
                }
                
                previewImg.src = this.logoDataUrl;
                previewImg.style.display = 'block';
                previewImg.alt = file.name;
                
                if (this.removeLogoBtn) {
                    this.removeLogoBtn.style.display = 'flex';
                }
            };
            
            reader.readAsDataURL(file);
        }
    }

    removeLogo() {
        if (this.logoInput) {
            this.logoInput.value = '';
        }
        
        this.logoDataUrl = null; // Clear stored logo
        
        const previewImg = this.previewContainer.querySelector('img');
        if (previewImg) {
            previewImg.style.display = 'none';
            previewImg.src = '';
        }
        
        if (this.removeLogoBtn) {
            this.removeLogoBtn.style.display = 'none';
        }
    }

    generatePreview() {
        const modal = document.getElementById('preview-modal');
        const modalContent = modal.querySelector('.preview-content');
        
        // Update logo in preview
        const logoContainer = modalContent.querySelector('.logo-container img');
        if (logoContainer) {
            if (this.logoDataUrl) {
                logoContainer.src = this.logoDataUrl;
                logoContainer.style.display = 'block';
            } else {
                logoContainer.style.display = 'none';
            }
        }

        // ... rest of preview generation code ...
        
        modal.style.display = 'block';
    }
}

// Initialize the invoice generator when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new InvoiceGenerator();
});
