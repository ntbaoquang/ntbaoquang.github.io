function initializeSalesModule(app) {
    const { callAppsScript, getCachedDanhMuc, showToast, showModal, hideModal, invalidateCache, generateOptions, state: appState } = app;
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');

    const removeDiacritics = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    };

    const formatNumber = (num) => {
        if (isNaN(num)) return '0';
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    const parseFormattedNumber = (str) => {
        if (!str) return 0;
        // Handles formats like "1.000.000"
        return parseFloat(String(str).replace(/\./g, '').replace(/,/g, '.')) || 0;
    };
    
    const setupNumericInputFormatting = (inputElement) => {
        if (!inputElement) return;
        inputElement.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value) {
                e.target.value = formatNumber(parseInt(value, 10));
            } else {
                e.target.value = '';
            }
        });
        inputElement.addEventListener('blur', (e) => {
            if (e.target.value.trim() === '') {
                e.target.value = '0';
            }
        });
        inputElement.addEventListener('focus', e => e.target.select());
    };

    const showAddCustomerModal = (onSuccess) => {
        const modalContent = `
            <form id="add-customer-form">
                <div class="input-group"><label for="new-customer-ten">Họ Tên</label><input type="text" id="new-customer-ten" required></div>
                <div class="input-group"><label for="new-customer-sdt">Số điện thoại</label><input type="text" id="new-customer-sdt"></div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                     <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-close-btn').click()">Hủy</button>
                     <button type="submit" class="btn btn-primary">Lưu</button>
                </div>
            </form>
        `;
        showModal('Thêm Khách Hàng Mới', modalContent);

        document.getElementById('add-customer-form').addEventListener('submit', e => {
            e.preventDefault();
            const hoTen = document.getElementById('new-customer-ten').value.trim();
            const sdt = document.getElementById('new-customer-sdt').value.trim();
            if (!hoTen) return;

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            hideModal();
            showToast('Đang thêm khách hàng...', 'info');
            
            callAppsScript('addDanhMucItem', {
                tenDanhMuc: 'DanhMucKhachHang',
                itemData: { HoTen: hoTen, SoDienThoai: sdt }
            })
            .then(newItem => {
                invalidateCache('DanhMucKhachHang');
                showToast(`Đã thêm khách hàng "${hoTen}"!`, 'success');
                if (onSuccess) onSuccess(newItem.MaKhachHang);
            })
            .catch(err => {
                 showToast(`Lỗi: ${err.message}`, 'error');
            });
        });
    };

    const updatePageTitle = (title) => pageTitle.textContent = title;
    
    async function renderPOS() {
        updatePageTitle('Bán hàng');
        mainContent.innerHTML = `<p>Đang tải...</p>`;

        let danhMucKhachHang, danhMucThuoc, donViQuyDoi;
        let currentCart = [];
        let currentDrugSelection = null;
        let appSettings = appState.cache['appSettings'] || {}; // Use cached settings
        
        // --- QR CODE GENERATION HELPERS ---
        const crc16ccitt = (data) => {
            let crc = 0xFFFF;
            for (let i = 0; i < data.length; i++) {
                crc ^= data.charCodeAt(i) << 8;
                for (let j = 0; j < 8; j++) {
                    crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
                }
            }
            return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
        };

        const buildQRField = (id, value) => {
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.length === 0) return '';
            const len = stringValue.length.toString().padStart(2, '0');
            return `${id}${len}${stringValue}`;
        };

        const generateQRCodePayload = (bankBin, accountNumber, amount, description) => {
            const merchantAccountInfo =
                buildQRField('00', 'A000000727') +
                buildQRField('01', buildQRField('00', bankBin) + buildQRField('01', accountNumber));
            const transactionInfo = `TT ${description}`;
            const additionalData = buildQRField('08', transactionInfo);
            const integerAmount = Math.round(amount || 0).toString();
            let payload =
                buildQRField('00', '01') +
                buildQRField('01', '11') +
                buildQRField('38', merchantAccountInfo) +
                buildQRField('53', '704') +
                buildQRField('54', integerAmount) + 
                buildQRField('58', 'VN') +
                buildQRField('62', additionalData);
            payload += '6304';
            const crc = crc16ccitt(payload);
            return payload + crc;
        };
        
        const generateQrCodeDataURL = (payload) => {
          return new Promise((resolve, reject) => {
            try {
              if (typeof QRCode === 'undefined') {
                return reject(new Error('Thư viện QRCode chưa được tải.'));
              }
        
              const opts = { width: 220, margin: 1, errorCorrectionLevel: 'H' };
        
              // 1) Handle `qrcode` library (from npm) which has a `toDataURL` method.
              // This method can either return a Promise or use a callback.
              if (typeof QRCode.toDataURL === 'function') {
                try {
                  const maybePromise = QRCode.toDataURL(payload, opts);
                  if (maybePromise && typeof maybePromise.then === 'function') {
                    maybePromise.then(url => resolve(url)).catch(err => reject(err));
                    return;
                  } else {
                    // Fallback to callback style for older versions
                    QRCode.toDataURL(payload, opts, (err, url) => {
                      if (err) return reject(err);
                      resolve(url);
                    });
                    return;
                  }
                } catch (e) {
                  console.warn('QRCode.toDataURL failed, trying other methods:', e);
                }
              }
        
              // 2) Handle libraries that have a `toCanvas` method.
              if (typeof QRCode.toCanvas === 'function') {
                try {
                  const canvas = document.createElement('canvas');
                  QRCode.toCanvas(canvas, payload, opts, (err) => {
                    if (err) return reject(err);
                    try { resolve(canvas.toDataURL('image/png')); } catch (err2) { reject(err2); }
                  });
                  return;
                } catch (e) {
                  console.warn('QRCode.toCanvas failed, trying other methods:', e);
                }
              }
        
              // 3) Handle `qrcodejs` library, which uses a constructor API.
              if (typeof QRCode === 'function' || (typeof QRCode === 'object' && QRCode.CorrectLevel)) {
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                document.body.appendChild(tempDiv);
        
                try {
                  new QRCode(tempDiv, {
                    text: payload,
                    width: 220,
                    height: 220,
                    correctLevel: (QRCode.CorrectLevel ? QRCode.CorrectLevel.H : undefined)
                  });
                } catch (errCreate) {
                  // Fallback for versions that take the payload string directly
                  try {
                    new QRCode(tempDiv, payload);
                  } catch (err2) {
                    document.body.removeChild(tempDiv);
                    return reject(err2);
                  }
                }
        
                // Wait for the library to render the QR code (often asynchronously)
                setTimeout(() => {
                  try {
                    let dataURL = '';
                    const img = tempDiv.querySelector('img');
                    if (img && img.src) {
                        dataURL = img.src;
                    } else {
                      const canvas = tempDiv.querySelector('canvas');
                      if (canvas) dataURL = canvas.toDataURL('image/png');
                    }
                    document.body.removeChild(tempDiv);
                    if (dataURL) return resolve(dataURL);
                    return reject(new Error('Could not extract dataURL from the generated QR code.'));
                  } catch (e) {
                    try { document.body.removeChild(tempDiv); } catch(_) {}
                    return reject(e);
                  }
                }, 300); // 300ms is a safe timeout for rendering
                return;
              }
        
              // If no compatible API was found
              return reject(new Error('The loaded QRCode library is not compatible.'));
            } catch (err) {
              return reject(err);
            }
          });
        };


        const printReceipt = async (printData, settings) => {
            const { hoaDon, chiTiet, tenKhachHang, tenNguoiBan } = printData;
            const { 
                TenNhaThuoc = 'Nhà Thuốc', 
                DiaChi = 'Chưa cấu hình địa chỉ',
                SoDienThoai = 'Chưa cấu hình SĐT',
                MaNganHangBIN = '',
                SoTaiKhoan = ''
            } = settings;

            let qrCodeHtml = '';
            if (MaNganHangBIN && SoTaiKhoan && hoaDon.ThanhTien > 0) {
                try {
                    const payload = generateQRCodePayload(MaNganHangBIN, SoTaiKhoan, hoaDon.ThanhTien, hoaDon.MaHoaDon);
                    const qrDataURL = await generateQrCodeDataURL(payload);
                    qrCodeHtml = `
                        <div class="qr-container">
                            <p>Quét mã để thanh toán</p>
                            <img src="${qrDataURL}" alt="VietQR Code" style="max-width: 60mm;"/>
                        </div>
                    `;
                } catch (error) {
                    console.error('Không thể tạo mã QR VietQR:', error);
                    qrCodeHtml = `<div class="qr-container"><p style="color:red; font-size: 8pt;">Lỗi tạo mã QR</p></div>`;
                }
            }

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Hóa đơn ${hoaDon.MaHoaDon}</title>
                        <style>
                            @media print { @page { size: 80mm auto; margin: 2mm; } body { margin: 0; color: #000; } }
                            body { font-family: 'Verdana', 'Arial', sans-serif; font-size: 10pt; width: 76mm; }
                            .receipt { text-align: center; }
                            .header, .footer { text-align: center; }
                            h1 { font-size: 12pt; margin: 5px 0; }
                            p { margin: 2px 0; }
                            .info { text-align: left; margin-top: 5px; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 5px 0; }
                            .info p { display: flex; justify-content: space-between; }
                            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                            th { text-align: left; border-bottom: 1px solid black; }
                            td { padding: 2px 0; }
                            .item-row td { vertical-align: top; }
                            .item-row .price-col { text-align: right; }
                            .summary { margin-top: 5px; border-top: 1px dashed black; padding-top: 5px; }
                            .summary p { display: flex; justify-content: space-between; }
                            .total { font-weight: bold; font-size: 11pt; }
                            .qr-container { margin-top: 10px; display: flex; flex-direction: column; align-items: center; gap: 5px; page-break-inside: avoid; }
                            .qr-container p { font-size: 9pt; }
                        </style>
                    </head>
                    <body>
                        <div class="receipt">
                            <div class="header">
                                <h1>${TenNhaThuoc}</h1>
                                <p>${DiaChi}</p>
                                <p>SĐT: ${SoDienThoai}</p>
                            </div>
                            <h2>HÓA ĐƠN BÁN LẺ</h2>
                            <div class="info">
                                <p><span>Số HĐ:</span> <span>${hoaDon.MaHoaDon}</span></p>
                                <p><span>Ngày:</span> <span>${new Date(hoaDon.NgayBan).toLocaleString('vi-VN')}</span></p>
                                <p><span>Thu ngân:</span> <span>${tenNguoiBan}</span></p>
                                <p><span>Khách hàng:</span> <span>${tenKhachHang}</span></p>
                            </div>
                            <table>
                                <thead><tr><th>Tên hàng</th><th style="text-align:right">T.Tiền</th></tr></thead>
                                <tbody>
                                    ${chiTiet.map(item => `
                                        <tr class="item-row">
                                            <td>${item.tenThuoc} (${item.donViTinh})<br>${item.soLuong} x ${formatNumber(item.donGia)}</td>
                                            <td class="price-col">${formatNumber(item.thanhTien)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            <div class="summary">
                                <p><span>Tổng tiền hàng:</span> <span>${formatNumber(hoaDon.TongTien)}đ</span></p>
                                <p><span>Giảm giá:</span> <span>${formatNumber(hoaDon.GiamGia)}đ</span></p>
                                <p class="total"><span>THÀNH TIỀN:</span> <span>${formatNumber(hoaDon.ThanhTien)}đ</span></p>
                            </div>
                            ${qrCodeHtml}
                            <div class="footer"><p style="margin-top: 10px;">Cảm ơn quý khách!</p></div>
                        </div>
                    </body>
                </html>`);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 250);
        };
        // --- END QR CODE ---

        const handlePayment = async (shouldPrint) => {
            const submitBtn = document.getElementById('submit-invoice-btn');
            const printBtn = document.getElementById('submit-invoice-print-btn');
            
            if (currentCart.length === 0) {
                showToast('Hóa đơn trống. Vui lòng thêm sản phẩm.', 'error');
                return;
            }
        
            submitBtn.disabled = true;
            printBtn.disabled = true;
            submitBtn.textContent = 'Đang xử lý...';
            printBtn.textContent = 'Đang xử lý...';
        
            const subtotal = currentCart.reduce((sum, item) => sum + item.thanhTien, 0);
            const discount = parseFormattedNumber(document.getElementById('summary-discount').value);
            const total = Math.max(0, subtotal - discount);
            
            const maHoaDon_FE = `HD${new Date().getTime()}`;
            const ngayBan_FE = new Date();
        
            const hoaDonData = {
                maHoaDon: maHoaDon_FE,
                ngayBan: ngayBan_FE.toISOString(),
                MaKhachHang: document.getElementById('customer-select').value,
                TongTien: subtotal,
                GiamGia: discount,
                ThanhTien: total,
                NguoiBan: appState.currentUser.MaNhanVien,
                GhiChu: `P.thức TT: ${document.getElementById('payment-method').value}`,
                items: currentCart.map(item => ({
                    MaThuoc: item.maThuoc,
                    SoLuong: item.soLuong,
                    DonGia: item.donGia,
                    ThanhTien: item.thanhTien,
                    soLuongQuyDoi: item.soLuongQuyDoi
                }))
            };

            if (shouldPrint) {
                const customerSelect = document.getElementById('customer-select');
                const selectedOption = customerSelect.options[customerSelect.selectedIndex];
                const tenKhachHang = selectedOption.value === 'KHACHLE' ? 'Khách lẻ' : selectedOption.text;
                
                const printData = {
                    hoaDon: {
                        MaHoaDon: hoaDonData.maHoaDon,
                        NgayBan: ngayBan_FE,
                        TongTien: hoaDonData.TongTien,
                        GiamGia: hoaDonData.GiamGia,
                        ThanhTien: hoaDonData.ThanhTien
                    },
                    chiTiet: currentCart.map(item => ({...item})),
                    tenKhachHang: tenKhachHang,
                    tenNguoiBan: appState.currentUser.HoTen
                };

                await printReceipt(printData, appSettings);
                renderPOS();
                showToast(`Đang in hóa đơn ${hoaDonData.maHoaDon}...`, 'info');

                callAppsScript('addHoaDon', hoaDonData)
                    .then(result => {
                        showToast(`Đã lưu hóa đơn ${result.hoaDon.MaHoaDon} thành công!`, 'success');
                        invalidateCache('HoaDon');
                    })
                    .catch(error => {
                        showToast(`LỖI LƯU HÓA ĐƠN TRƯỚC (${hoaDonData.maHoaDon}): ${error.message}`, 'error', 15000);
                    });

            } else {
                renderPOS(); 
                showToast('Đang lưu hóa đơn...', 'info');

                callAppsScript('addHoaDon', hoaDonData)
                    .then(result => {
                        showToast(`Lưu hóa đơn ${result.hoaDon.MaHoaDon} thành công!`, 'success');
                         invalidateCache('HoaDon');
                    })
                    .catch(error => {
                        showToast(`LỖI LƯU HÓA ĐƠN TRƯỚC: ${error.message}`, 'error', 10000);
                    });
            }
        };

        try {
            [danhMucKhachHang, danhMucThuoc, donViQuyDoi, appSettings] = await Promise.all([
                 getCachedDanhMuc('DanhMucKhachHang'),
                 getCachedDanhMuc('DanhMucThuoc'),
                 getCachedDanhMuc('DonViQuyDoi'),
                 appState.cache['appSettings'] ? Promise.resolve(appState.cache['appSettings']) : callAppsScript('getAppSettings')
            ]);
            appState.cache['appSettings'] = appSettings;
           
            mainContent.innerHTML = `
                <div class="pos-layout">
                    <div class="pos-main">
                        <div class="card">
                            <div class="card-header">
                                <h3>Thông tin sản phẩm</h3>
                                <button class="btn btn-secondary" id="refresh-data-btn" title="Làm mới danh mục"><span class="material-symbols-outlined">refresh</span></button>
                            </div>
                            <div class="card-body">
                                <div class="input-group" style="position: relative;">
                                    <label>Tìm kiếm thuốc (Tên, SĐK, Mã vạch, Hoạt chất)</label>
                                    <input type="search" id="drug-search" placeholder="Gõ từ 2 ký tự trở lên hoặc quét mã vạch..." autocomplete="off">
                                    <div id="drug-suggestions" class="suggestions-dropdown" style="display:none;"></div>
                                </div>
                                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 2fr; gap: 15px; align-items: end;">
                                    <div class="input-group">
                                        <label>Đơn vị tính</label>
                                        <select id="drug-unit" disabled></select>
                                    </div>
                                    <div class="input-group">
                                        <label>Số lượng</label>
                                        <input type="number" id="drug-quantity" value="1" min="1" disabled>
                                    </div>
                                    <div class="input-group">
                                        <label>Giá bán</label>
                                        <input type="text" id="drug-price" value="0" disabled style="text-align: right;">
                                    </div>
                                    <button class="btn btn-primary" id="add-to-cart-btn" disabled style="grid-column: 4; height: 46px;">Thêm (Enter)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="pos-sidebar">
                        <h3>Hóa đơn hiện tại</h3>
                         <div class="input-group">
                            <label for="customer-select">Khách hàng</label>
                            <select id="customer-select">
                                <option value="KHACHLE">Khách lẻ</option>
                                ${generateOptions(danhMucKhachHang, 'MaKhachHang', 'HoTen', null, 'Thêm khách hàng mới...')}
                            </select>
                        </div>
                        <div id="invoice-items-list" class="table-wrapper" style="max-height: 250px; overflow-y: auto;"><p>Chưa có sản phẩm.</p></div>
                        <div id="invoice-summary" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;">
                            <div style="display: flex; justify-content: space-between;"><span>Tổng tiền hàng:</span><span id="summary-subtotal">0đ</span></div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label for="summary-discount" style="margin: 0;">Giảm giá:</label>
                                <input type="text" id="summary-discount" value="0" style="width: 120px; text-align: right; padding: 5px;">
                            </div>
                            <div style="display: flex; justify-content: space-between;"><span>Khách cần trả:</span><strong id="summary-total">0đ</strong></div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label for="summary-payment" style="margin: 0; font-weight: bold;">Khách thanh toán (F8):</label>
                                <input type="text" id="summary-payment" value="0" style="width: 120px; text-align: right; padding: 5px; font-weight: bold;">
                            </div>
                             <div style="display: flex; justify-content: space-between;"><span>Tiền thừa trả khách:</span><span id="summary-change">0đ</span></div>
                             <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label for="payment-method" style="margin: 0;">P.thức T.toán:</label>
                                <select id="payment-method" style="padding: 5px;"><option value="Tiền mặt">Tiền mặt</option><option value="Chuyển khoản">Chuyển khoản</option></select>
                            </div>
                        </div>
                        <div style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
                           <button id="submit-invoice-btn" class="btn btn-success" style="width: 100%;">Thanh toán (F9)</button>
                           <button id="submit-invoice-print-btn" class="btn btn-primary" style="width: 100%;">Thanh toán và in (Ctrl+F9)</button>
                        </div>
                    </div>
                </div>
            `;
            
            const drugSearchInput = document.getElementById('drug-search');
            const drugSuggestionsDiv = document.getElementById('drug-suggestions');
            const drugUnitSelect = document.getElementById('drug-unit');
            const drugQuantityInput = document.getElementById('drug-quantity');
            const drugPriceInput = document.getElementById('drug-price');
            const addToCartBtn = document.getElementById('add-to-cart-btn');
            
            const summaryDiscountInput = document.getElementById('summary-discount');
            const summaryPaymentInput = document.getElementById('summary-payment');
            const submitInvoiceBtn = document.getElementById('submit-invoice-btn');
            const submitInvoicePrintBtn = document.getElementById('submit-invoice-print-btn');
            
            setupNumericInputFormatting(summaryDiscountInput);
            setupNumericInputFormatting(summaryPaymentInput);
            setupNumericInputFormatting(drugPriceInput);

            const updateSummary = () => {
                const subtotal = currentCart.reduce((sum, item) => sum + item.thanhTien, 0);
                const discount = parseFormattedNumber(summaryDiscountInput.value);
                const total = Math.max(0, subtotal - discount);
                const payment = parseFormattedNumber(summaryPaymentInput.value);
                const change = Math.max(0, payment - total);

                document.getElementById('summary-subtotal').textContent = `${formatNumber(subtotal)}đ`;
                document.getElementById('summary-total').textContent = `${formatNumber(total)}đ`;
                document.getElementById('summary-change').textContent = `${formatNumber(change)}đ`;
            };
            
            const renderCart = () => {
                const cartListEl = document.getElementById('invoice-items-list');
                if (currentCart.length === 0) {
                    cartListEl.innerHTML = '<p>Chưa có sản phẩm.</p>';
                } else {
                    cartListEl.innerHTML = `
                        <table style="font-size: 0.9rem;">
                            <thead><tr><th>Tên thuốc</th><th>SL</th><th>Đ.Giá</th><th>T.Tiền</th><th></th></tr></thead>
                            <tbody>
                            ${currentCart.map((item, index) => `
                                <tr>
                                    <td>${item.tenThuoc} (${item.donViTinh})</td>
                                    <td>${item.soLuong}</td>
                                    <td>${formatNumber(item.donGia)}</td>
                                    <td>${formatNumber(item.thanhTien)}</td>
                                    <td><button type="button" class="btn-remove-item" data-index="${index}" style="background:none;border:none;color:var(--danger-color);cursor:pointer;font-size:1.2rem;line-height:1;">&times;</button></td>
                                </tr>`).join('')}
                            </tbody>
                        </table>`;
                }
                updateSummary();
            };
            
            const selectDrug = (maThuoc) => {
                currentDrugSelection = danhMucThuoc.find(t => t.MaThuoc === maThuoc);
                drugSearchInput.value = currentDrugSelection.TenThuoc;
                drugSuggestionsDiv.innerHTML = '';
                drugSuggestionsDiv.style.display = 'none';
                
                let units = donViQuyDoi.filter(dv => dv.MaThuoc === maThuoc);
                if (units.length === 0) {
                     units.push({ MaThuoc: maThuoc, DonViTinh: currentDrugSelection.DonViCoSo, TyLeQuyDoi: 1, GiaBan: 0 });
                }
                drugUnitSelect.innerHTML = generateOptions(units, 'DonViTinh', 'DonViTinh');
                drugUnitSelect.disabled = false;
                drugQuantityInput.disabled = false;
                drugPriceInput.disabled = false;
                addToCartBtn.disabled = false;
                drugUnitSelect.dispatchEvent(new Event('change'));
                drugUnitSelect.focus();
            };

            drugUnitSelect.addEventListener('change', () => {
                 const donViTinh = drugUnitSelect.value;
                 const unitInfo = donViQuyDoi.find(dv => dv.MaThuoc === currentDrugSelection?.MaThuoc && dv.DonViTinh === donViTinh);
                 const price = unitInfo ? (unitInfo.GiaBan || 0) : 0;
                 drugPriceInput.value = formatNumber(price);
            });
            
            drugSearchInput.addEventListener('input', () => {
                const term = drugSearchInput.value.trim();
                const normalizedTerm = removeDiacritics(term.toLowerCase());

                const barcodeMatch = donViQuyDoi.find(dv => dv.MaVach && dv.MaVach === term);
                if(barcodeMatch) {
                    selectDrug(barcodeMatch.MaThuoc);
                    drugUnitSelect.value = barcodeMatch.DonViTinh;
                    drugUnitSelect.dispatchEvent(new Event('change'));
                    drugQuantityInput.focus();
                    drugQuantityInput.select();
                    return;
                }

                if (term.length < 2) {
                    drugSuggestionsDiv.style.display = 'none';
                    return;
                }
                
                const results = danhMucThuoc.filter(thuoc => {
                    return removeDiacritics(thuoc.TenThuoc.toLowerCase()).includes(normalizedTerm) ||
                           (thuoc.HoatChat && removeDiacritics(thuoc.HoatChat.toLowerCase()).includes(normalizedTerm)) ||
                           (thuoc.SoDangKy && removeDiacritics(thuoc.SoDangKy.toLowerCase()).includes(normalizedTerm));
                });
                
                drugSuggestionsDiv.innerHTML = results.slice(0, 10).map((thuoc, index) => {
                    const defaultUnit = donViQuyDoi.find(u => u.MaThuoc === thuoc.MaThuoc && u.TyLeQuyDoi === 1) || donViQuyDoi.find(u => u.MaThuoc === thuoc.MaThuoc) || { GiaBan: 0 };
                    return `<div class="suggestion-item ${index === 0 ? 'selected' : ''}" data-ma-thuoc="${thuoc.MaThuoc}">
                        <strong>${thuoc.TenThuoc} - ${formatNumber(defaultUnit.GiaBan)}đ</strong><br>
                        <small>${thuoc.HoatChat || ''} ${thuoc.HamLuong || ''} - SĐK: ${thuoc.SoDangKy || 'N/A'}</small>
                    </div>`;
                }).join('');
                drugSuggestionsDiv.style.display = results.length > 0 ? 'block' : 'none';
            });
            
            drugSuggestionsDiv.addEventListener('click', e => {
                const item = e.target.closest('.suggestion-item');
                if (!item) return;
                selectDrug(item.dataset.maThuoc);
            });

            addToCartBtn.addEventListener('click', () => {
                 if (!currentDrugSelection) return;
                 const soLuong = parseInt(drugQuantityInput.value, 10);
                 const donViTinh = drugUnitSelect.value;
                 const donGia = parseFormattedNumber(drugPriceInput.value);
                 if (isNaN(soLuong) || soLuong <= 0) {
                     showToast('Số lượng không hợp lệ', 'error');
                     return;
                 }
                 const unitInfo = donViQuyDoi.find(dv => dv.MaThuoc === currentDrugSelection.MaThuoc && dv.DonViTinh === donViTinh) || { TyLeQuyDoi: 1 };

                 currentCart.push({
                     maThuoc: currentDrugSelection.MaThuoc,
                     tenThuoc: currentDrugSelection.TenThuoc,
                     soLuong: soLuong,
                     donViTinh: donViTinh,
                     donGia: donGia,
                     thanhTien: soLuong * donGia,
                     soLuongQuyDoi: soLuong * (unitInfo.TyLeQuyDoi)
                 });

                 renderCart();
                 drugSearchInput.value = '';
                 drugUnitSelect.innerHTML = '';
                 drugUnitSelect.disabled = true;
                 drugQuantityInput.value = 1;
                 drugQuantityInput.disabled = true;
                 drugPriceInput.value = '0';
                 drugPriceInput.disabled = true;
                 addToCartBtn.disabled = true;
                 currentDrugSelection = null;
                 drugSearchInput.focus();
            });
            
            document.getElementById('invoice-items-list').addEventListener('click', e => {
                if(e.target.classList.contains('btn-remove-item')) {
                    currentCart.splice(parseInt(e.target.dataset.index, 10), 1);
                    renderCart();
                }
            });

            summaryDiscountInput.addEventListener('input', updateSummary);
            summaryPaymentInput.addEventListener('input', updateSummary);

            document.getElementById('customer-select').addEventListener('change', e => {
                if (e.target.value === '--add-new--') {
                    showAddCustomerModal(async (newCustomerId) => {
                        const customerSelect = document.getElementById('customer-select');
                        const updatedCustomers = await getCachedDanhMuc('DanhMucKhachHang', true);
                        customerSelect.innerHTML = `<option value="KHACHLE">Khách lẻ</option>${generateOptions(updatedCustomers, 'MaKhachHang', 'HoTen', newCustomerId, 'Thêm khách hàng mới...')}`;
                    });
                }
            });

            document.getElementById('refresh-data-btn').addEventListener('click', () => {
                showToast('Đang làm mới dữ liệu...', 'info');
                Promise.all([
                    invalidateCache('DanhMucThuoc'),
                    invalidateCache('DonViQuyDoi'),
                    invalidateCache('DanhMucKhachHang'),
                    invalidateCache('CaiDat')
                ]).then(() => {
                    showToast('Làm mới dữ liệu thành công!', 'success');
                    delete appState.cache['appSettings']; // clear local cache for settings
                    renderPOS();
                }).catch(e => showToast(`Lỗi: ${e.message}`, 'error'));
            });
            
            drugSearchInput.addEventListener('keydown', (e) => {
                const suggestions = drugSuggestionsDiv.querySelectorAll('.suggestion-item');
                if (suggestions.length === 0) return;
                let selected = drugSuggestionsDiv.querySelector('.selected');
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (selected && selected.nextElementSibling) {
                        selected.classList.remove('selected');
                        selected.nextElementSibling.classList.add('selected');
                    }
                } else if (e.key === 'ArrowUp') {
                     e.preventDefault();
                    if (selected && selected.previousElementSibling) {
                        selected.classList.remove('selected');
                        selected.previousElementSibling.classList.add('selected');
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if(selected) selectDrug(selected.dataset.maThuoc);
                }
            });

            drugUnitSelect.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    drugQuantityInput.focus();
                    drugQuantityInput.select();
                }
            });

            drugQuantityInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    drugPriceInput.focus();
                    drugPriceInput.select();
                }
            });

            drugPriceInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addToCartBtn.click();
                }
            });
            
            document.addEventListener('keydown', (e) => {
                if (window.location.hash !== '#banhang') return;
                if (e.key === 'F8') {
                    e.preventDefault();
                    summaryPaymentInput.focus();
                    summaryPaymentInput.select();
                } else if (e.key === 'F9' && !e.ctrlKey) {
                    e.preventDefault();
                    submitInvoiceBtn.click();
                } else if (e.key === 'F9' && e.ctrlKey) {
                    e.preventDefault();
                    submitInvoicePrintBtn.click();
                }
            });
            
            submitInvoiceBtn.addEventListener('click', () => handlePayment(false));
            submitInvoicePrintBtn.addEventListener('click', () => handlePayment(true));
            
            drugSearchInput.focus();

        } catch (error) {
            mainContent.innerHTML = `<div class="card" style="color: var(--danger-color);"><p><strong>Lỗi khi tải dữ liệu trang bán hàng:</strong> ${error.message}</p></div>`;
        }
    }

    async function renderInvoices() {
        updatePageTitle('Hóa đơn');
        mainContent.innerHTML = `<div class="card"><p>Đang tải danh sách hóa đơn...</p></div>`;
        try {
            const hoaDon = await callAppsScript('getDanhMuc', { tenDanhMuc: 'HoaDon' });
            mainContent.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>Danh sách hóa đơn</h3>
                        <input type="search" placeholder="Tìm kiếm hóa đơn...">
                    </div>
                    <div class="card-body table-wrapper">
                        <table>
                            <thead><tr><th>Mã HĐ</th><th>Khách hàng</th><th>Thành tiền</th><th>Ngày bán</th><th>Người bán</th><th class="action-cell">Hành động</th></tr></thead>
                            <tbody id="hoa-don-tbody">
                                ${hoaDon.reverse().map(inv => `
                                    <tr data-ma-hd="${inv.MaHoaDon}">
                                        <td>${inv.MaHoaDon}</td>
                                        <td>${inv.MaKhachHang}</td>
                                        <td>${inv.ThanhTien.toLocaleString('vi-VN')}đ</td>
                                        <td>${new Date(inv.NgayBan).toLocaleDateString('vi-VN')}</td>
                                        <td>${inv.NguoiBan}</td>
                                        <td class="action-cell">
                                            <div class="action-menu">
                                                <button class="btn-actions">...</button>
                                                <div class="action-menu-dropdown">
                                                    <a href="#" class="action-item" data-action="view">Xem chi tiết</a>
                                                    <a href="#" class="action-item" data-action="edit">Sửa phiếu</a>
                                                    <a href="#" class="action-item" data-action="print">In phiếu</a>
                                                    <a href="#" class="action-item" data-action="delete">Xóa phiếu</a>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            document.getElementById('hoa-don-tbody').addEventListener('click', e => {
                 if (e.target.classList.contains('action-item')) {
                    e.preventDefault();
                    const action = e.target.dataset.action;
                    const maHD = e.target.closest('tr').dataset.maHd;
                    handleHoaDonAction(action, maHD);
                }
            });
        } catch (error) {
             mainContent.innerHTML = `<div class="card" style="color: var(--danger-color);"><p><strong>Lỗi tải dữ liệu hóa đơn:</strong> ${error.message}</p></div>`;
        }
    }

    const handleHoaDonAction = async (action, maHD) => {
        switch(action) {
            case 'view':
                const modalContent = await renderHoaDonDetailForModal(maHD);
                showModal(`Chi tiết hóa đơn ${maHD}`, modalContent, { size: '800px' });
                break;
            case 'edit':
            case 'print':
            case 'delete':
                showToast(`Chức năng "${action}" đang được phát triển.`, 'info');
                break;
        }
    };
    
    async function renderHoaDonDetailForModal(maHD) {
        try {
            const { hoaDon, chiTiet } = await callAppsScript('getHoaDonDetail', { maHoaDon: maHD });
             return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
                    <p><strong>Mã hóa đơn:</strong> ${hoaDon.MaHoaDon}</p>
                    <p><strong>Khách hàng:</strong> ${hoaDon.TenKhachHang || hoaDon.MaKhachHang}</p>
                    <p><strong>Ngày bán:</strong> ${new Date(hoaDon.NgayBan).toLocaleString('vi-VN')}</p>
                    <p><strong>Người bán:</strong> ${hoaDon.NguoiBan}</p>
                    <p><strong>Tổng tiền:</strong> ${hoaDon.TongTien.toLocaleString('vi-VN')}đ</p>
                    <p><strong>Giảm giá:</strong> ${hoaDon.GiamGia.toLocaleString('vi-VN')}đ</p>
                    <p><strong>Thành tiền:</strong> ${hoaDon.ThanhTien.toLocaleString('vi-VN')}đ</p>
                </div>
                <h4>Chi tiết hàng hóa:</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Tên thuốc</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                        <tbody>
                        ${chiTiet.map(item => `
                            <tr>
                                <td>${item.TenThuoc}</td>
                                <td>${item.SoLuong}</td>
                                <td>${item.DonGia.toLocaleString('vi-VN')}đ</td>
                                <td>${item.ThanhTien.toLocaleString('vi-VN')}đ</td>
                            </tr>
                        `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch(e) {
            return `<p style="color:red">Lỗi tải dữ liệu chi tiết: ${e.message}</p>`;
        }
    }

    return {
        banhang: renderPOS,
        hoadon: renderInvoices,
    }
}
