function initializePharmacyModule(app) {
    const { callAppsScript, getCachedDanhMuc, showToast, showModal, hideModal, invalidateCache, generateOptions, state: appState } = app;
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');

    // --- DYNAMIC "QUICK ADD" HELPERS ---
    const showAddSupplierModal = (selectElementToUpdate) => {
        const modalContent = `
            <form id="add-supplier-form">
                <div class="input-group">
                    <label for="new-ncc-ten">Tên nhà cung cấp</label>
                    <input type="text" id="new-ncc-ten" required>
                </div>
                <div class="input-group">
                    <label for="new-ncc-diachi">Địa chỉ</label>
                    <input type="text" id="new-ncc-diachi">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                     <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-close-btn').click()">Hủy</button>
                     <button type="submit" class="btn btn-primary">Lưu</button>
                </div>
            </form>
        `;
        showModal('Thêm Nhà Cung Cấp Mới', modalContent);

        document.getElementById('add-supplier-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const tenNcc = document.getElementById('new-ncc-ten').value.trim();
            const diaChi = document.getElementById('new-ncc-diachi').value.trim();
            if (!tenNcc) return;

            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            hideModal();
            showToast('Đang thêm nhà cung cấp...', 'info');

            callAppsScript('addDanhMucItem', {
                tenDanhMuc: 'DanhMucNhaCungCap',
                itemData: { TenNhaCungCap: tenNcc, DiaChi: diaChi }
            })
            .then(async (newItem) => {
                const updatedData = await getCachedDanhMuc('DanhMucNhaCungCap', true); // Force refresh
                showToast(`Đã thêm nhà cung cấp "${tenNcc}"!`, 'success');
                if (selectElementToUpdate) {
                    selectElementToUpdate.innerHTML = `
                        <option value="">-- Chọn nhà cung cấp --</option>
                        ${generateOptions(updatedData, 'MaNhaCungCap', 'TenNhaCungCap', newItem.MaNhaCungCap, 'Thêm mới nhà cung cấp...')}
                    `;
                }
            })
            .catch(err => {
                showToast(`Lỗi: ${err.message}`, 'error');
                if (selectElementToUpdate) {
                    const addNewOpt = Array.from(selectElementToUpdate.options).find(o => o.value === '--add-new--');
                    if(addNewOpt) selectElementToUpdate.value = '';
                }
            });
        });
    };
    
    const showAddThuocModal = async (selectedNsxId = null, onSuccessCallback = null, defaultValues = {}) => {
        const danhMucNSX = await getCachedDanhMuc('DanhMucNhaSanXuat');
        const modalContent = `
            <form id="add-thuoc-form">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="input-group" style="grid-column: 1 / -1;">
                        <label for="new-thuoc-ten">Tên thuốc (*)</label>
                        <input type="text" id="new-thuoc-ten" required value="${defaultValues.TenThuoc || ''}">
                    </div>
                    <div class="input-group">
                        <label for="new-thuoc-hoatchat">Hoạt chất</label>
                        <input type="text" id="new-thuoc-hoatchat" value="${defaultValues.HoatChat || ''}">
                    </div>
                    <div class="input-group">
                        <label for="new-thuoc-hamluong">Hàm lượng</label>
                        <input type="text" id="new-thuoc-hamluong" value="${defaultValues.HamLuong || ''}">
                    </div>
                    <div class="input-group">
                        <label for="new-thuoc-sodangky">Số đăng ký</label>
                        <input type="text" id="new-thuoc-sodangky" value="${defaultValues.SoDangKy || ''}">
                    </div>
                    <div class="input-group">
                        <label for="new-thuoc-quycach">Quy cách đóng gói</label>
                        <input type="text" id="new-thuoc-quycach" value="${defaultValues.QuyCachDongGoi || ''}">
                    </div>
                    <div class="input-group">
                        <label for="new-thuoc-donvicoso">Đơn vị cơ sở (*)</label>
                        <input type="text" id="new-thuoc-donvicoso" required placeholder="Viên, Gói, Chai..." value="${defaultValues.DonViCoSo || ''}">
                    </div>
                    <div class="input-group">
                        <label for="new-thuoc-nhomthuoc">Nhóm thuốc</label>
                        <input type="text" id="new-thuoc-nhomthuoc" value="${defaultValues.NhomThuoc || ''}">
                    </div>
                    <div class="input-group">
                        <label for="nsx-select">Nhà sản xuất (*)</label>
                        <select id="nsx-select" required>
                            <option value="">-- Chọn nhà sản xuất --</option>
                            ${generateOptions(danhMucNSX, 'MaNhaSanXuat', 'TenNhaSanXuat', selectedNsxId || defaultValues.MaNhaSanXuat, 'Thêm mới nhà sản xuất...')}
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="new-thuoc-tonkhotoithieu">Tồn kho tối thiểu</label>
                        <input type="number" id="new-thuoc-tonkhotoithieu" min="0" value="${defaultValues.TonKhoToiThieu || '0'}">
                    </div>
                    <div class="input-group" style="grid-column: 1 / -1;">
                        <label for="new-thuoc-ghichu">Ghi chú</label>
                        <textarea id="new-thuoc-ghichu" rows="2">${defaultValues.GhiChu || ''}</textarea>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-close-btn').click()">Hủy</button>
                    <button type="submit" class="btn btn-primary">Lưu</button>
                </div>
            </form>
        `;
        showModal('Thêm Thuốc Mới', modalContent);
        
        document.getElementById('nsx-select').addEventListener('change', e => {
            if (e.target.value === '--add-new--') {
                const preservedData = {
                    TenThuoc: document.getElementById('new-thuoc-ten').value,
                    HoatChat: document.getElementById('new-thuoc-hoatchat').value,
                    HamLuong: document.getElementById('new-thuoc-hamluong').value,
                    SoDangKy: document.getElementById('new-thuoc-sodangky').value,
                    QuyCachDongGoi: document.getElementById('new-thuoc-quycach').value,
                    DonViCoSo: document.getElementById('new-thuoc-donvicoso').value,
                    NhomThuoc: document.getElementById('new-thuoc-nhomthuoc').value,
                    TonKhoToiThieu: document.getElementById('new-thuoc-tonkhotoithieu').value,
                    GhiChu: document.getElementById('new-thuoc-ghichu').value,
                };
                showAddNsxModal(preservedData, onSuccessCallback);
            }
        });
        
        document.getElementById('add-thuoc-form').addEventListener('submit', async e => {
            e.preventDefault();
            const tenThuoc = document.getElementById('new-thuoc-ten').value.trim();
            const donViCoSo = document.getElementById('new-thuoc-donvicoso').value.trim();
            const maNSX = document.getElementById('nsx-select').value;
            if(!tenThuoc || !donViCoSo || !maNSX) {
                alert('Vui lòng điền đầy đủ các trường bắt buộc (*).');
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            try {
                // Check for duplicate drug name
                const allThuoc = await getCachedDanhMuc('DanhMucThuoc');
                const existingDrug = allThuoc.find(t => t.TenThuoc.trim().toLowerCase() === tenThuoc.toLowerCase());
                if (existingDrug) {
                    if (!confirm(`Thuốc "${tenThuoc}" đã tồn tại. Bạn có chắc chắn muốn thêm một thuốc mới với tên này không?`)) {
                        submitBtn.disabled = false;
                        return; // Stop if user cancels
                    }
                }

                const thuocData = {
                    TenThuoc: tenThuoc,
                    HoatChat: document.getElementById('new-thuoc-hoatchat').value.trim(),
                    HamLuong: document.getElementById('new-thuoc-hamluong').value.trim(),
                    SoDangKy: document.getElementById('new-thuoc-sodangky').value.trim(),
                    QuyCachDongGoi: document.getElementById('new-thuoc-quycach').value.trim(),
                    DonViCoSo: donViCoSo,
                    NhomThuoc: document.getElementById('new-thuoc-nhomthuoc').value.trim(),
                    MaNhaSanXuat: maNSX,
                    TonKhoToiThieu: document.getElementById('new-thuoc-tonkhotoithieu').value || 0,
                    GhiChu: document.getElementById('new-thuoc-ghichu').value.trim()
                };

                hideModal();
                showToast('Đang thêm thuốc mới...', 'info');

                const newThuoc = await callAppsScript('addThuoc', thuocData);
                await getCachedDanhMuc('DanhMucThuoc', true); // Force refresh
                showToast(`Đã thêm thuốc "${newThuoc.TenThuoc}" thành công!`, 'success');
                if(window.location.hash === '#danhmuc') {
                    renderDanhMuc(); 
                }
                if (onSuccessCallback) {
                    onSuccessCallback(newThuoc);
                }
            } catch (err) {
                showToast(`Lỗi: ${err.message}`, 'error');
            } finally {
                if (!document.getElementById('modal-container').classList.contains('hidden')) {
                   hideModal(); // Ensure modal is closed on error too
                }
                 submitBtn.disabled = false;
            }
        });
    };
    
    const showAddNsxModal = (preservedThuocData = {}, onSuccessCallback = null) => {
        const modalContent = `
            <form id="add-nsx-form">
                <div class="input-group"><label for="new-nsx-ten">Tên nhà sản xuất</label><input type="text" id="new-nsx-ten" required></div>
                <div class="input-group"><label for="new-nsx-quocgia">Quốc gia</label><input type="text" id="new-nsx-quocgia"></div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                     <button type="button" class="btn btn-secondary" id="cancel-add-nsx">Hủy</button>
                     <button type="submit" class="btn btn-primary">Lưu</button>
                </div>
            </form>
        `;
        showModal('Thêm Nhà Sản Xuất Mới', modalContent);
        document.getElementById('cancel-add-nsx').addEventListener('click', () => {
            showAddThuocModal(null, onSuccessCallback, preservedThuocData);
        });
        
        document.getElementById('add-nsx-form').addEventListener('submit', e => {
            e.preventDefault();
            const tenNsx = document.getElementById('new-nsx-ten').value.trim();
            const quocGia = document.getElementById('new-nsx-quocgia').value.trim();
            if (!tenNsx) return;

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            hideModal();
            showToast(`Đang thêm nhà sản xuất...`, 'info');

            callAppsScript('addDanhMucItem', {
                tenDanhMuc: 'DanhMucNhaSanXuat',
                itemData: { TenNhaSanXuat: tenNsx, QuocGia: quocGia }
            })
            .then(newItem => {
                invalidateCache('DanhMucNhaSanXuat');
                showToast(`Đã thêm NSX "${tenNsx}"!`, 'success');
                showAddThuocModal(newItem.MaNhaSanXuat, onSuccessCallback, preservedThuocData);
            })
            .catch(err => {
                showToast(`Lỗi: ${err.message}`, 'error');
                showAddThuocModal(null, onSuccessCallback, preservedThuocData);
            });
        });
    };

    // --- PAGE RENDERERS ---
    const updatePageTitle = (title) => pageTitle.textContent = title;

    const renderPlaceholder = (title, description) => {
        updatePageTitle(title);
        mainContent.innerHTML = `<div class="card"><div class="card-header"><h3>${title}</h3></div><div class="card-body"><p>${description}</p><p>Chức năng này đang được phát triển.</p></div></div>`;
    };

    async function renderDashboard() {
        updatePageTitle('Tổng quan');
        mainContent.innerHTML = `<p>Đang tải dữ liệu...</p>`;
        try {
            const data = await callAppsScript('getDashboardData');
            
            mainContent.innerHTML = `
                <div class="grid-container">
                    <div class="stat-card sales">
                        <div class="icon"><span class="material-symbols-outlined">receipt</span></div>
                        <div class="info"><h4>${data.totalSales}</h4><p>Hóa đơn hôm nay</p></div>
                    </div>
                    <div class="stat-card revenue">
                        <div class="icon"><span class="material-symbols-outlined">payments</span></div>
                        <div class="info"><h4>${data.totalRevenue}</h4><p>Doanh thu hôm nay</p></div>
                    </div>
                    <div class="stat-card expired">
                        <div class="icon"><span class="material-symbols-outlined">medication</span></div>
                        <div class="info"><h4>${data.expiredDrugs}</h4><p>Thuốc sắp hết hạn</p></div>
                    </div>
                    <div class="stat-card low-stock">
                        <div class="icon"><span class="material-symbols-outlined">production_quantity_limits</span></div>
                        <div class="info"><h4>${data.lowStockDrugs}</h4><p>Thuốc sắp hết hàng</p></div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>Hóa đơn gần đây</h3></div>
                    <div class="card-body table-wrapper">
                        <table>
                            <thead><tr><th>Mã HĐ</th><th>Khách hàng</th><th>Tổng tiền</th><th>Ngày bán</th></tr></thead>
                            <tbody>
                                ${data.recentInvoices.map(inv => `
                                    <tr>
                                        <td>${inv.MaHoaDon}</td>
                                        <td>${inv.MaKhachHang}</td>
                                        <td>${inv.ThanhTien.toLocaleString('vi-VN')}đ</td>
                                        <td>${new Date(inv.NgayBan).toLocaleDateString('vi-VN')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            mainContent.innerHTML = `<div class="card" style="color: var(--danger-color);"><p><strong>Lỗi khi tải dữ liệu trang tổng quan:</strong> ${error.message}</p></div>`;
        }
    }
    
    async function renderDanhSachThuocKho() {
        updatePageTitle('Danh sách thuốc trong kho');
        mainContent.innerHTML = `<div class="card"><p>Đang tải dữ liệu kho...</p></div>`;
        try {
            const inventorySummary = await callAppsScript('getInventorySummary');

            mainContent.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>Danh sách thuốc trong kho</h3>
                    </div>
                    <div class="card-body table-wrapper">
                        <table>
                            <thead><tr><th>Mã thuốc</th><th>Tên thuốc</th><th>Tổng tồn kho</th><th>Đơn vị cơ sở</th><th>Hành động</th></tr></thead>
                            <tbody>
                                ${inventorySummary.map(item => `
                                    <tr>
                                        <td>${item.MaThuoc}</td>
                                        <td>${item.TenThuoc}</td>
                                        <td>${item.tongTon}</td>
                                        <td>${item.DonViCoSo}</td>
                                        <td><button class="btn btn-secondary btn-view-detail" data-ma-thuoc="${item.MaThuoc}">Xem chi tiết</button></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            document.querySelectorAll('.btn-view-detail').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const maThuoc = e.currentTarget.dataset.maThuoc;
                    const thuoc = (await getCachedDanhMuc('DanhMucThuoc')).find(t => t.MaThuoc === maThuoc);
                    const chiTietTonKho = await callAppsScript('getInventoryDetail', { maThuoc });
                    const content = `
                        <div class="table-wrapper">
                            <table>
                                <thead><tr><th>Số lô</th><th>Số lượng</th><th>Hạn sử dụng</th></tr></thead>
                                <tbody>
                                ${chiTietTonKho.map(k => `
                                    <tr><td>${k.SoLo}</td><td>${k.SoLuong} ${thuoc.DonViCoSo}</td><td>${new Date(k.HanSuDung).toLocaleDateString('vi-VN')}</td></tr>
                                `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                    showModal(`Chi tiết tồn kho: ${thuoc.TenThuoc}`, content);
                });
            });
        } catch (error) {
            mainContent.innerHTML = `<div class="card" style="color: var(--danger-color);"><p><strong>Lỗi tải dữ liệu kho:</strong> ${error.message}</p></div>`;
        }
    }
    
    async function renderDanhSachPhieuNhap() {
        updatePageTitle('Danh sách phiếu nhập kho');
        mainContent.innerHTML = `<div class="card"><p>Đang tải dữ liệu...</p></div>`;
        try {
            // Sử dụng cache. Sẽ chỉ gọi API ở lần đầu tiên, các lần sau sẽ lấy từ cache.
            const [phieuNhapList, nccList] = await Promise.all([
                getCachedDanhMuc('PhieuNhap'), 
                getCachedDanhMuc('DanhMucNhaCungCap')
            ]);
            
            const nccMap = new Map(nccList.map(ncc => [ncc.MaNhaCungCap, ncc.TenNhaCungCap]));

            mainContent.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>Danh sách phiếu nhập kho</h3>
                        <button class="btn btn-primary" id="btn-nhap-kho">Tạo Phiếu Nhập Kho</button>
                    </div>
                    <div class="card-body table-wrapper">
                        <table>
                            <thead><tr><th>Mã PN</th><th>Ngày nhập</th><th>Nhà cung cấp</th><th>Tổng tiền</th><th class="action-cell">Hành động</th></tr></thead>
                            <tbody id="phieu-nhap-table-body">
                                ${phieuNhapList.reverse().map(pn => `
                                    <tr data-ma-pn="${pn.MaPhieuNhap}">
                                        <td>${pn.MaPhieuNhap}</td>
                                        <td>${new Date(pn.NgayNhap).toLocaleString('vi-VN')}</td>
                                        <td>${nccMap.get(pn.MaNhaCungCap) || pn.MaNhaCungCap}</td>
                                        <td>${(pn.TongTien || 0).toLocaleString('vi-VN')}đ</td>
                                        <td class="action-cell">
                                            <div class="action-menu">
                                                <button class="btn-actions">...</button>
                                                <div class="action-menu-dropdown">
                                                    <a href="#" class="action-item" data-action="view">Xem chi tiết</a>
                                                    <a href="#" class="action-item" data-action="print">In phiếu</a>
                                                    <a href="#" class="action-item" data-action="edit">Sửa phiếu</a>
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

            document.getElementById('btn-nhap-kho').addEventListener('click', () => {
                window.location.hash = 'nhapkho';
            });

            document.getElementById('phieu-nhap-table-body').addEventListener('click', e => {
                if (e.target.classList.contains('action-item')) {
                    e.preventDefault();
                    const action = e.target.dataset.action;
                    const maPN = e.target.closest('tr').dataset.maPn;
                    handlePhieuNhapAction(action, maPN);
                }
            });

        } catch (error) {
             mainContent.innerHTML = `<div class="card" style="color: var(--danger-color);"><p><strong>Lỗi tải dữ liệu phiếu nhập:</strong> ${error.message}</p></div>`;
        }
    }
    
    const handlePhieuNhapAction = async (action, maPN) => {
        switch (action) {
            case 'view':
                const modalContent = await renderPhieuNhapDetailForModal(maPN);
                showModal(`Chi tiết phiếu nhập ${maPN}`, modalContent, { size: '800px' });
                break;
            case 'print':
                printPhieuNhap(maPN);
                break;
            case 'edit':
                window.location.hash = `nhapkho-edit?id=${maPN}`;
                break;
            case 'delete':
                showToast('Chức năng "Xóa phiếu" đang được phát triển.', 'info');
                break;
        }
    };

    async function renderNhapKhoForm(editData = null) {
        const isEditMode = editData !== null;
        updatePageTitle(isEditMode ? `Sửa Phiếu Nhập Kho: ${editData.phieuNhap.MaPhieuNhap}` : 'Tạo Phiếu Nhập Kho');
        mainContent.innerHTML = `<div class="card"><p>Đang tải dữ liệu...</p></div>`;
    
        let receiptItems = [];
    
        let danhMucNCC, danhMucThuoc, donViQuyDoi;
        try {
            [danhMucNCC, danhMucThuoc, donViQuyDoi] = await Promise.all([
                getCachedDanhMuc('DanhMucNhaCungCap'),
                getCachedDanhMuc('DanhMucThuoc'),
                getCachedDanhMuc('DonViQuyDoi')
            ]);
        } catch (error) {
            mainContent.innerHTML = `<div class="card" style="color:var(--danger-color)">Lỗi tải dữ liệu cần thiết: ${error.message}</div>`;
            return;
        }
    
        const getThuocName = (maThuoc) => danhMucThuoc.find(t => t.MaThuoc === maThuoc)?.TenThuoc || 'Không rõ';
    
        const pageContent = `
            <form id="nhap-kho-form">
                <div class="card">
                    <div class="card-header"><h3>Thông tin chung</h3></div>
                    <div class="card-body" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                        <div class="input-group">
                            <label for="ncc-select">Nhà cung cấp <span style="color:red;">*</span></label>
                            <select id="ncc-select" required></select>
                        </div>
                        <div class="input-group">
                            <label for="so-hoa-don-ncc">Số hóa đơn NCC</label>
                            <input type="text" id="so-hoa-don-ncc">
                        </div>
                        <div class="input-group">
                            <label for="ngay-hoa-don">Ngày hóa đơn</label>
                            <input type="date" id="ngay-hoa-don">
                        </div>
                    </div>
                </div>
    
                <div class="pos-layout" style="align-items: flex-start;">
                    <div class="pos-main">
                        <div class="card">
                            <div class="card-body">
                                <div id="product-details-form" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; align-items: end;">
                                    <div class="input-group" style="grid-column: 1 / -1; position: relative;">
                                        <label for="item-thuoc-search">Hàng hóa <span style="color:red;">*</span></label>
                                        <div style="display: flex;">
                                            <input type="text" id="item-thuoc-search" placeholder="Nhập từ khóa để tìm kiếm..." autocomplete="off" style="flex-grow: 1; border-radius: 6px 0 0 6px;">
                                            <button type="button" id="clear-thuoc-selection" class="btn btn-danger" style="border-radius: 0 6px 6px 0; padding: 10px 12px; display: flex; align-items: center;">&times;</button>
                                        </div>
                                        <input type="hidden" id="item-thuoc-select">
                                        <div id="thuoc-suggestions" class="suggestions-dropdown" style="display:none;"></div>
                                    </div>
                                    <div class="input-group"><label>Loại hàng hóa <span style="color:red;">*</span></label><select disabled><option selected>Dược phẩm</option></select></div>
                                    <div class="input-group"><label>Nhóm hàng hóa</label><input type="text" id="nhom-hang-hoa" disabled></div>
                                    <div class="input-group"><label>Hoạt chất chính</label><input type="text" id="hoat-chat" disabled></div>
                                    <div class="input-group"><label>Hàm lượng</label><input type="text" id="ham-luong" disabled></div>
                                    <div class="input-group"><label>Số đăng ký <span style="color:red;">*</span></label><input type="text" id="so-dang-ky" disabled></div>
                                    <div class="input-group"><label>Hãng sản xuất</label><input type="text" id="hang-san-xuat" disabled></div>
                                    <div class="input-group"><label>Nước sản xuất</label><input type="text" id="nuoc-san-xuat" disabled></div>
                                    <div class="input-group"><label>Quy cách đóng gói <span style="color:red;">*</span></label><input type="text" id="quy-cach" disabled></div>
                                    <div class="input-group"><label for="don-vi-co-ban">Đơn vị cơ bản <span style="color:red;">*</span></label><input type="text" id="don-vi-co-ban" disabled></div>
                                    <div class="input-group"><label for="don-vi-nhap">Đơn vị nhập <span style="color:red;">*</span></label><select id="don-vi-nhap"><option>Chọn đơn vị tính</option></select></div>
                                    <div class="input-group"><label>Tỷ lệ quy đổi <span style="color:red;">*</span></label><input type="number" id="ty-le-quy-doi" value="1" style="background-color: #e9ecef;" readonly></div>
                                    <div class="input-group"><label for="so-lo">Số lô <span style="color:red;">*</span></label><input type="text" id="so-lo"></div>
                                    <div class="input-group"><label for="han-su-dung">Hạn sử dụng <span style="color:red;">*</span></label><input type="date" id="han-su-dung"></div>
                                    <div class="input-group"><label for="so-luong-nhap">Số lượng nhập <span style="color:red;">*</span></label><input type="number" id="so-luong-nhap" min="1" value="1"></div>
                                    <div class="input-group"><label for="don-gia-nhap">Đơn giá nhập</label><input type="number" id="don-gia-nhap" min="0" value="0"></div>
                                    <div class="input-group"><label for="tong-chiet-khau">Tổng chiết khấu</label><input type="number" id="tong-chiet-khau" min="0" value="0"></div>
                                    <div class="input-group"><label for="vat-nhap">VAT (nhập)</label><input type="number" id="vat-nhap" min="0" value="0"></div>
                                    <div class="input-group"><label>Thành tiền</label><input type="text" id="thanh-tien" value="0" style="background-color: #e9ecef; text-align: right;" readonly></div>
                                </div>
                                <div id="unit-definition-section" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                                    <h5 style="margin-bottom: 10px; font-size: 1rem;">Danh sách đơn vị tính</h5>
                                    <div class="table-wrapper">
                                        <table style="font-size: 0.9rem;">
                                            <thead style="background-color: #f8f9fa;">
                                                <tr><th>Tên đơn vị <span style="color:red;">*</span></th><th>Quy đổi <span style="color:red;">*</span></th><th>Giá bán</th><th>Mã vạch</th><th></th></tr>
                                            </thead>
                                            <tbody id="unit-definition-tbody">
                                                <!-- Rows will be generated by JS -->
                                            </tbody>
                                        </table>
                                    </div>
                                    <button type="button" id="add-unit-row-btn" class="btn" style="margin-top: 10px; padding: 5px 10px;">+ Thêm đơn vị tính</button>
                                </div>
                                <div style="text-align: right; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 20px;">
                                    <button type="button" class="btn btn-primary" id="add-item-btn">Thêm vào phiếu</button>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div class="pos-sidebar">
                        <div class="card">
                            <div class="card-header"><h4>Danh sách hàng hóa</h4></div>
                            <div class="card-body">
                                <div id="receipt-items-list" class="table-wrapper" style="min-height: 200px;"><p>Chưa có hàng hóa.</p></div>
                                <div class="receipt-totals" style="padding-top: 15px; border-top: 1px solid var(--border-color);">
                                    <div style="display:flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem;"><span>Tổng tiền hàng:</span><span id="receipt-subtotal">0đ</span></div>
                                    <div style="display:flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem;"><span>Tổng VAT:</span><span id="receipt-vat">0đ</span></div>
                                    <div class="invoice-total" style="display:flex; justify-content: space-between; margin-top: 12px;">
                                        <strong>Tổng thanh toán:</strong>
                                        <strong id="receipt-grand-total">0đ</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    
                <div class="card">
                    <div class="card-body" style="text-align: right;">
                        <button type="button" class="btn btn-secondary" id="cancel-receipt-btn" style="margin-right: 10px;">Hủy</button>
                        <button type="submit" class="btn btn-primary" id="save-receipt-btn">
                            ${isEditMode ? 'Cập nhật phiếu nhập' : 'Lưu Phiếu Nhập'}
                        </button>
                    </div>
                </div>
            </form>
        `;
        mainContent.innerHTML = pageContent;

        const nccSelect = document.getElementById('ncc-select');
        nccSelect.innerHTML = `<option value="">-- Chọn nhà cung cấp --</option>
            ${generateOptions(danhMucNCC, 'MaNhaCungCap', 'TenNhaCungCap', isEditMode ? editData.phieuNhap.MaNhaCungCap : null, 'Thêm mới nhà cung cấp...')}`;

        const soHoaDonNCCInput = document.getElementById('so-hoa-don-ncc');
        const ngayHoaDonInput = document.getElementById('ngay-hoa-don');

        if (isEditMode) {
            soHoaDonNCCInput.value = editData.phieuNhap.SoHoaDonNCC || '';
            ngayHoaDonInput.value = editData.phieuNhap.NgayHoaDon ? new Date(editData.phieuNhap.NgayHoaDon).toISOString().split('T')[0] : '';

            // Map chiTiet to receiptItems
            receiptItems = editData.chiTiet.map(item => {
                const donVi = donViQuyDoi.find(dv => dv.MaThuoc === item.MaThuoc && dv.DonViTinh === item.DonViNhap);
                const tyLe = donVi ? donVi.TyLeQuyDoi : 1;
                return {
                    MaThuoc: item.MaThuoc,
                    DonViNhap: item.DonViNhap,
                    SoLuongNhap: item.SoLuongNhap,
                    DonGiaNhap: item.DonGiaNhap,
                    SoLo: item.SoLo,
                    HanSuDung: new Date(item.HanSuDung).toISOString().split('T')[0],
                    chietKhau: 0, // Chiết khấu không được lưu, giả định là 0 khi sửa
                    vat: item.VAT || item.vat || 0,
                    ThanhTien: item.ThanhTien,
                    soLuongQuyDoi: item.SoLuongNhap * tyLe,
                    donViQuyDoiUpdates: [] // Không cần update DVQĐ khi sửa
                };
            });

        } else {
            const today = new Date().toISOString().split('T')[0];
            ngayHoaDonInput.value = today;
        }
    
        const receiptItemsListEl = document.getElementById('receipt-items-list');
        const receiptSubtotalEl = document.getElementById('receipt-subtotal');
        const receiptVatEl = document.getElementById('receipt-vat');
        const receiptGrandTotalEl = document.getElementById('receipt-grand-total');
        const thuocSearchInput = document.getElementById('item-thuoc-search');
        const thuocHiddenInput = document.getElementById('item-thuoc-select');
        const thuocSuggestionsDiv = document.getElementById('thuoc-suggestions');
        const unitTbody = document.getElementById('unit-definition-tbody');

        const updateItemSubtotal = () => {
            const soLuong = parseFloat(document.getElementById('so-luong-nhap').value) || 0;
            const donGia = parseFloat(document.getElementById('don-gia-nhap').value) || 0;
            const chietKhau = parseFloat(document.getElementById('tong-chiet-khau').value) || 0;
            const vat = parseFloat(document.getElementById('vat-nhap').value) || 0;
            const tienHang = soLuong * donGia;
            const tienTruocThue = tienHang - chietKhau;
            const tienVat = tienTruocThue * (vat / 100);
            const thanhTien = tienTruocThue + tienVat;
            document.getElementById('thanh-tien').value = isNaN(thanhTien) ? '0đ' : thanhTien.toLocaleString('vi-VN') + 'đ';
        };
        
        const addUnitRow = (unit = { DonViTinh: '', TyLeQuyDoi: 1, GiaBan: 0, MaVach: '' }) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="unit-name" value="${unit.DonViTinh}" placeholder="Vd: Vỉ" style="padding: 8px; width: 100px;"></td>
                <td><input type="number" class="unit-rate" value="${unit.TyLeQuyDoi}" min="1" style="width: 70px; padding: 8px;"></td>
                <td><input type="number" class="unit-price" value="${unit.GiaBan}" min="0" style="width: 100px; padding: 8px;"></td>
                <td><input type="text" class="unit-barcode" value="${unit.MaVach}" placeholder="Mã tự động" style="padding: 8px;"></td>
                <td><button type="button" class="btn-remove-unit" style="background:none; border:none; color:var(--danger-color); cursor:pointer; font-size: 1.5rem; line-height: 1;">&times;</button></td>
            `;
            unitTbody.appendChild(tr);
            tr.querySelector('.btn-remove-unit').addEventListener('click', () => tr.remove());
        };

        const showAddNewUnitModal = () => {
            const baseUnit = document.getElementById('don-vi-co-ban').value;
            if (!baseUnit) {
                showToast('Vui lòng chọn một sản phẩm trước khi thêm đơn vị mới.', 'error');
                const donViNhapSelect = document.getElementById('don-vi-nhap');
                donViNhapSelect.value = donViNhapSelect.options[0]?.value || '';
                return;
            }

            const modalContent = `
                <form id="add-new-unit-form">
                    <p>Đơn vị cơ sở của sản phẩm này là: <strong>${baseUnit}</strong>. Tỷ lệ quy đổi sẽ được tính dựa trên đơn vị này.</p>
                    <div class="input-group">
                        <label for="new-unit-name">Tên đơn vị mới (*)</label>
                        <input type="text" id="new-unit-name" required placeholder="Vd: Thùng">
                    </div>
                    <div class="input-group">
                        <label for="new-unit-rate">Tỷ lệ quy đổi (*)</label>
                        <input type="number" id="new-unit-rate" required min="1" placeholder="Vd: 1 Thùng = ? ${baseUnit}">
                    </div>
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" id="cancel-add-unit-btn">Hủy</button>
                        <button type="submit" class="btn btn-primary">Thêm</button>
                    </div>
                </form>
            `;
            showModal('Tạo Đơn Vị Tính Mới', modalContent);

            document.getElementById('cancel-add-unit-btn').addEventListener('click', () => {
                const donViNhapSelect = document.getElementById('don-vi-nhap');
                donViNhapSelect.value = donViNhapSelect.options[0]?.value || '';
                hideModal();
            });

            document.getElementById('add-new-unit-form').addEventListener('submit', (e) => {
                e.preventDefault();
                const newUnitName = document.getElementById('new-unit-name').value.trim();
                const newUnitRate = parseFloat(document.getElementById('new-unit-rate').value);

                if (!newUnitName || !newUnitRate || newUnitRate <= 0) {
                    showToast('Vui lòng điền đầy đủ thông tin hợp lệ.', 'error');
                    return;
                }

                addUnitRow({ DonViTinh: newUnitName, TyLeQuyDoi: newUnitRate, GiaBan: 0, MaVach: '' });

                const donViNhapSelect = document.getElementById('don-vi-nhap');
                const newOption = document.createElement('option');
                newOption.value = newUnitName;
                newOption.textContent = newUnitName;
                newOption.selected = true;
                const addNewOption = donViNhapSelect.querySelector('option[value="--add-new--"]');
                if (addNewOption) {
                    donViNhapSelect.insertBefore(newOption, addNewOption);
                } else {
                    donViNhapSelect.appendChild(newOption);
                }
                
                donViNhapSelect.dispatchEvent(new Event('change'));

                hideModal();
                showToast(`Đã thêm đơn vị "${newUnitName}".`, 'success');
            });
        };

        const updateTyLeQuyDoi = () => {
            const selectedUnit = document.getElementById('don-vi-nhap').value;
            const maThuoc = thuocHiddenInput.value;
            const tyLeInput = document.getElementById('ty-le-quy-doi');

            if (!maThuoc || !selectedUnit || selectedUnit === '--add-new--' || selectedUnit === 'Chọn đơn vị tính') {
                tyLeInput.value = 1;
                return;
            }
            
            const unitRows = unitTbody.querySelectorAll('tr');
            let foundInTable = false;
            for (const row of unitRows) {
                const unitNameInput = row.querySelector('.unit-name');
                if (unitNameInput && unitNameInput.value.trim().toLowerCase() === selectedUnit.toLowerCase()) {
                    const unitRateInput = row.querySelector('.unit-rate');
                    if (unitRateInput) {
                        tyLeInput.value = unitRateInput.value;
                        foundInTable = true;
                        break;
                    }
                }
            }
        
            if (foundInTable) return;
        
            const unitInfo = donViQuyDoi.find(dv => dv.MaThuoc === maThuoc && dv.DonViTinh === selectedUnit);
            if(unitInfo) {
                tyLeInput.value = unitInfo.TyLeQuyDoi;
            } else {
                 const baseUnit = danhMucThuoc.find(t => t.MaThuoc === maThuoc)?.DonViCoSo;
                 tyLeInput.value = (selectedUnit === baseUnit) ? 1 : 1;
            }
        };

        const renderUnitDefinitionTable = (maThuoc) => {
            unitTbody.innerHTML = ''; // Clear existing rows
            const product = danhMucThuoc.find(t => t.MaThuoc === maThuoc);
            if (!product) return;

            const units = donViQuyDoi.filter(dv => dv.MaThuoc === maThuoc);
            if (units.length > 0) {
                units.forEach(unit => addUnitRow(unit));
            } else {
                addUnitRow({ DonViTinh: product.DonViCoSo, TyLeQuyDoi: 1, GiaBan: 0, MaVach: '' });
            }
        };

        document.getElementById('add-unit-row-btn').addEventListener('click', () => addUnitRow());
        document.getElementById('don-vi-nhap').addEventListener('change', (e) => {
            if (e.target.value === '--add-new--') {
                showAddNewUnitModal();
            } else {
                updateTyLeQuyDoi();
            }
        });

        const productDetailFields = ['nhom-hang-hoa', 'hoat-chat', 'ham-luong', 'so-dang-ky', 'hang-san-xuat', 'nuoc-san-xuat', 'quy-cach', 'don-vi-co-ban'];
        const toggleProductFields = (disabled) => {
            productDetailFields.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.disabled = disabled;
            });
        };

        const resetProductForm = () => {
             thuocSearchInput.value = '';
             thuocHiddenInput.value = '';
             document.getElementById('so-lo').value = '';
             document.getElementById('han-su-dung').value = new Date().toISOString().split('T')[0];
             document.getElementById('so-luong-nhap').value = '1';
             document.getElementById('don-gia-nhap').value = '0';
             document.getElementById('tong-chiet-khau').value = '0';
             document.getElementById('vat-nhap').value = '0';
             document.getElementById('don-vi-nhap').innerHTML = '<option>Chọn đơn vị tính</option>';
             unitTbody.innerHTML = '';
             toggleProductFields(true); // Disable until a product is chosen
             productDetailFields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
             updateItemSubtotal();
             thuocSearchInput.focus();
        };

        document.getElementById('clear-thuoc-selection').addEventListener('click', resetProductForm);

        thuocSearchInput.addEventListener('input', () => {
            const searchTerm = thuocSearchInput.value.toLowerCase().trim();
            if (thuocHiddenInput.value) resetProductForm();
            thuocHiddenInput.value = '';
    
            if (!searchTerm) {
                thuocSuggestionsDiv.style.display = 'none';
                return;
            }
    
            const filtered = danhMucThuoc.filter(t => t.TenThuoc.toLowerCase().includes(searchTerm));
            thuocSuggestionsDiv.innerHTML = filtered.length > 0
                ? filtered.slice(0, 10).map(thuoc => `<div class="suggestion-item" data-ma-thuoc="${thuoc.MaThuoc}">${thuoc.TenThuoc}</div>`).join('')
                : `<div class="suggestion-item add-new" data-term="${thuocSearchInput.value}">+ Thêm mới thuốc "${thuocSearchInput.value}"</div>`;
            thuocSuggestionsDiv.style.display = 'block';
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.input-group')) {
                thuocSuggestionsDiv.style.display = 'none';
            }
        });

        const populateProductData = (maThuoc) => {
            const product = danhMucThuoc.find(t => t.MaThuoc === maThuoc);
            if (!product) return;
            thuocSearchInput.value = product.TenThuoc;
            thuocHiddenInput.value = product.MaThuoc;
            
            const fieldsToUpdate = {
                'nhom-hang-hoa': product.NhomThuoc, 'hoat-chat': product.HoatChat, 
                'ham-luong': product.HamLuong, 'so-dang-ky': product.SoDangKy, 
                'quy-cach': product.QuyCachDongGoi, 'don-vi-co-ban': product.DonViCoSo,
            };
            for (const [id, value] of Object.entries(fieldsToUpdate)) {
                const el = document.getElementById(id);
                if (el) el.value = value || '';
            }
            toggleProductFields(true);

            const units = donViQuyDoi.filter(dv => dv.MaThuoc === maThuoc);
            const donViNhapEl = document.getElementById('don-vi-nhap');
            const unitOptions = units.length > 0 ? units : [{DonViTinh: product.DonViCoSo}];
            donViNhapEl.innerHTML = generateOptions(unitOptions, 'DonViTinh', 'DonViTinh', null, '+ Tạo mới đơn vị...');
            
            renderUnitDefinitionTable(maThuoc);
            updateTyLeQuyDoi();
            document.getElementById('so-lo').focus();
        };

        thuocSuggestionsDiv.addEventListener('click', (e) => {
            const target = e.target.closest('.suggestion-item');
            if (!target) return;
            thuocSuggestionsDiv.style.display = 'none';
            if (target.classList.contains('add-new')) {
                 showAddThuocModal(null, (newThuoc) => {
                    Promise.all([
                        getCachedDanhMuc('DanhMucThuoc', true),
                        getCachedDanhMuc('DonViQuyDoi', true)
                    ]).then(results => {
                        danhMucThuoc = results[0];
                        donViQuyDoi = results[1];
                        populateProductData(newThuoc.MaThuoc);
                    });
                }, { TenThuoc: target.dataset.term });
            } else {
                populateProductData(target.dataset.maThuoc);
            }
        });
    
        const renderReceiptItemsList = () => {
            if (receiptItems.length === 0) {
                receiptItemsListEl.innerHTML = '<p>Chưa có hàng hóa.</p>';
                receiptSubtotalEl.textContent = '0đ';
                receiptVatEl.textContent = '0đ';
                receiptGrandTotalEl.textContent = '0đ';
                return;
            }

            let subtotal = 0;
            let totalVat = 0;

            receiptItems.forEach(item => {
                const itemTotal = item.SoLuongNhap * item.DonGiaNhap;
                const itemTotalAfterDiscount = itemTotal - (item.chietKhau || 0);
                const itemVatAmount = itemTotalAfterDiscount * ((item.vat || 0) / 100);
                subtotal += itemTotalAfterDiscount; // This is actually total before tax
                totalVat += itemVatAmount;
            });
            const grandTotal = subtotal + totalVat;

            receiptItemsListEl.innerHTML = `
                <table style="font-size: 0.9rem;">
                    <thead><tr><th>Tên thuốc</th><th>SL</th><th>Đ.Giá</th><th>T.Tiền</th><th></th></tr></thead>
                    <tbody>
                    ${receiptItems.map((item, index) => `
                        <tr>
                            <td>${getThuocName(item.MaThuoc)} (${item.DonViNhap})</td>
                            <td>${item.SoLuongNhap}</td>
                            <td>${item.DonGiaNhap.toLocaleString('vi-VN')}</td>
                            <td>${item.ThanhTien.toLocaleString('vi-VN')}</td>
                            <td><button type="button" class="btn-remove-item" data-index="${index}" style="background:none;border:none;color:var(--danger-color);cursor:pointer;font-size:1.2rem;line-height:1;">&times;</button></td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
            `;
            
            receiptSubtotalEl.textContent = subtotal.toLocaleString('vi-VN') + 'đ';
            receiptVatEl.textContent = totalVat.toLocaleString('vi-VN') + 'đ';
            receiptGrandTotalEl.textContent = grandTotal.toLocaleString('vi-VN') + 'đ';
    
            document.querySelectorAll('.btn-remove-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    receiptItems.splice(parseInt(e.currentTarget.dataset.index, 10), 1);
                    renderReceiptItemsList();
                });
            });
        };
    
        document.getElementById('add-item-btn').addEventListener('click', () => {
            const maThuoc = thuocHiddenInput.value;
            const soLo = document.getElementById('so-lo').value.trim();
            const hanSuDung = document.getElementById('han-su-dung').value;
            const soLuongNhap = parseInt(document.getElementById('so-luong-nhap').value, 10);
            const donViNhap = document.getElementById('don-vi-nhap').value;

            if (!maThuoc) { showToast('Vui lòng chọn một hàng hóa.', 'error'); thuocSearchInput.focus(); return; }
            if (!donViNhap || donViNhap === 'Chọn đơn vị tính' || donViNhap === '--add-new--') { showToast('Vui lòng chọn đơn vị nhập.', 'error'); document.getElementById('don-vi-nhap').focus(); return; }
            if (!soLo) { showToast('Vui lòng nhập Số lô.', 'error'); document.getElementById('so-lo').focus(); return; }
            if (!hanSuDung) { showToast('Vui lòng nhập Hạn sử dụng.', 'error'); document.getElementById('han-su-dung').focus(); return; }
            if (isNaN(soLuongNhap) || soLuongNhap <= 0) { showToast('Vui lòng nhập số lượng nhập hợp lệ.', 'error'); document.getElementById('so-luong-nhap').focus(); return; }
            
            const donGiaNhap = parseFloat(document.getElementById('don-gia-nhap').value) || 0;
            const chietKhau = parseFloat(document.getElementById('tong-chiet-khau').value) || 0;
            const vat = parseFloat(document.getElementById('vat-nhap').value) || 0;
            
            const tienHang = soLuongNhap * donGiaNhap;
            const tienTruocThue = tienHang - chietKhau;
            const tienVat = tienTruocThue * (vat / 100);
            const thanhTien = tienTruocThue + tienVat;

            const donViQuyDoiUpdates = [];
            unitTbody.querySelectorAll('tr').forEach(tr => {
                const donViTinh = tr.querySelector('.unit-name').value.trim();
                const tyLe = parseFloat(tr.querySelector('.unit-rate').value);
                if (donViTinh && tyLe > 0) {
                     donViQuyDoiUpdates.push({
                         DonViTinh: donViTinh,
                         TyLeQuyDoi: tyLe,
                         GiaBan: parseFloat(tr.querySelector('.unit-price').value) || 0,
                         MaVach: tr.querySelector('.unit-barcode').value.trim()
                     });
                }
            });

            if (donViQuyDoiUpdates.length === 0) { showToast('Phải có ít nhất một đơn vị tính hợp lệ.', 'error'); return; }
            
            receiptItems.push({
                MaThuoc: maThuoc,
                DonViNhap: document.getElementById('don-vi-nhap').value,
                SoLuongNhap: soLuongNhap,
                DonGiaNhap: donGiaNhap,
                SoLo: document.getElementById('so-lo').value.trim(),
                HanSuDung: document.getElementById('han-su-dung').value,
                chietKhau: chietKhau,
                vat: vat,
                ThanhTien: thanhTien,
                soLuongQuyDoi: soLuongNhap * (parseFloat(document.getElementById('ty-le-quy-doi').value) || 1),
                donViQuyDoiUpdates: donViQuyDoiUpdates
            });
    
            renderReceiptItemsList();
            resetProductForm();
        });
    
        document.getElementById('ncc-select').addEventListener('change', (e) => {
            if (e.target.value === '--add-new--') {
                showAddSupplierModal(document.getElementById('ncc-select'));
            }
        });
    
        document.getElementById('cancel-receipt-btn').addEventListener('click', () => {
            if (receiptItems.length === 0 || confirm('Bạn có chắc muốn hủy bỏ các thay đổi?')) {
                window.location.hash = 'danhsachphieunhap';
            }
        });
    
        document.getElementById('nhap-kho-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('save-receipt-btn');
            
            if (!document.getElementById('ncc-select').value) { showToast('Vui lòng chọn nhà cung cấp.', 'error'); return; }
            if (receiptItems.length === 0) { showToast('Vui lòng thêm ít nhất một sản phẩm vào phiếu nhập.', 'error'); return; }
    
            const phieuNhapData = {
                MaNhaCungCap: document.getElementById('ncc-select').value,
                SoHoaDonNCC: document.getElementById('so-hoa-don-ncc').value,
                NgayHoaDon: document.getElementById('ngay-hoa-don').value,
                TongTien: receiptItems.reduce((sum, item) => sum + item.ThanhTien, 0),
                NguoiNhap: appState.currentUser.MaNhanVien,
                GhiChu: '', // Add a GhiChu field if needed
                items: receiptItems
            };
    
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang lưu...';
    
            try {
                if (isEditMode) {
                    await callAppsScript('updatePhieuNhap', {
                        maPhieuNhap: editData.phieuNhap.MaPhieuNhap,
                        phieuNhapData: phieuNhapData
                    });
                    showToast(`Phiếu nhập ${editData.phieuNhap.MaPhieuNhap} đã được cập nhật thành công!`, 'success');
                } else {
                    const result = await callAppsScript('addPhieuNhap', phieuNhapData);
                    showToast(`Phiếu nhập ${result.MaPhieuNhap} đã được tạo thành công!`, 'success');
                }
                
                invalidateCache('PhieuNhap'); // Invalidate cache after adding/updating
                invalidateCache('DonViQuyDoi'); 
                window.location.hash = 'danhsachphieunhap';

            } catch(error) {
                showToast(`Lỗi khi lưu phiếu nhập: ${error.message}`, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = isEditMode ? 'Cập nhật phiếu nhập' : 'Lưu Phiếu Nhập';
            }
        });

        ['so-luong-nhap', 'don-gia-nhap', 'tong-chiet-khau', 'vat-nhap'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateItemSubtotal);
        });

        // Initial setup
        renderReceiptItemsList();
        resetProductForm();
    }

    async function renderNhapKhoPage() {
        await renderNhapKhoForm();
    }
    
    async function renderEditNhapKhoPage(params) {
        const maPN = params.get('id');
        if (!maPN) {
            mainContent.innerHTML = `<div class="card" style="color:var(--danger-color)">Không tìm thấy mã phiếu nhập.</div>`;
            return;
        }
        mainContent.innerHTML = `<div class="card"><p>Đang tải dữ liệu phiếu nhập ${maPN}...</p></div>`;
        try {
            const data = await callAppsScript('getPhieuNhapDetail', { maPhieuNhap: maPN });
            await renderNhapKhoForm(data);
        } catch (error) {
            mainContent.innerHTML = `<div class="card" style="color:var(--danger-color)">Lỗi tải dữ liệu phiếu nhập: ${error.message}</div>`;
        }
    }
    
    let dmThuocCurrentPage = 1;
    const dmThuocItemsPerPage = 10;

    function renderDanhMuc() {
        updatePageTitle('Danh mục');
        mainContent.innerHTML = `
            <div class="card">
                <div class="tabs" id="danhmuc-tabs">
                    <button class="tab-link active" data-tab="thuoc">Thuốc</button>
                    <button class="tab-link" data-tab="khachhang">Khách hàng</button>
                    <button class="tab-link" data-tab="ncc">Nhà cung cấp</button>
                    <button class="tab-link" data-tab="nsx">Nhà sản xuất</button>
                </div>
                <div id="danhmuc-content"><p>Đang tải...</p></div>
            </div>
        `;
        const tabContainer = document.getElementById('danhmuc-content');
        const tabs = document.querySelectorAll('#danhmuc-tabs .tab-link');

        const renderTabContent = async (tabId) => {
            tabContainer.innerHTML = `<p>Đang tải dữ liệu danh mục...</p>`;
            try {
                let content = '';
                let data, headers, rows;
                switch(tabId) {
                    case 'thuoc':
                        dmThuocCurrentPage = 1;
                        await renderDanhMucThuoc(tabContainer);
                        return;
                    case 'khachhang':
                        data = await getCachedDanhMuc('DanhMucKhachHang');
                        headers = `<th>Mã KH</th><th>Họ Tên</th><th>Số điện thoại</th>`;
                        rows = data.map(k => `<tr><td>${k.MaKhachHang}</td><td>${k.HoTen}</td><td>${k.SoDienThoai}</td></tr>`).join('');
                        content = `
                            <div class="card-header"><h3 style="margin:0;">Danh mục khách hàng</h3><button class="btn btn-primary" id="add-btn">Thêm khách hàng</button></div>
                            <div class="table-wrapper"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
                        break;
                    case 'ncc':
                        data = await getCachedDanhMuc('DanhMucNhaCungCap');
                        headers = `<th>Mã NCC</th><th>Tên nhà cung cấp</th><th>Địa chỉ</th>`;
                        rows = data.map(n => `<tr><td>${n.MaNhaCungCap}</td><td>${n.TenNhaCungCap}</td><td>${n.DiaChi}</td></tr>`).join('');
                        content = `
                            <div class="card-header"><h3 style="margin:0;">Danh mục nhà cung cấp</h3><button class="btn btn-primary" id="add-btn">Thêm NCC</button></div>
                            <div class="table-wrapper"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
                        break;
                    case 'nsx':
                        data = await getCachedDanhMuc('DanhMucNhaSanXuat');
                        headers = `<th>Mã NSX</th><th>Tên nhà sản xuất</th><th>Quốc gia</th>`;
                        rows = data.map(n => `<tr><td>${n.MaNhaSanXuat}</td><td>${n.TenNhaSanXuat}</td><td>${n.QuocGia}</td></tr>`).join('');
                        content = `
                            <div class="card-header"><h3 style="margin:0;">Danh mục nhà sản xuất</h3><button class="btn btn-primary" id="add-btn">Thêm NSX</button></div>
                            <div class="table-wrapper"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
                        break;
                }
                tabContainer.innerHTML = content;
                const addBtn = document.getElementById('add-btn');
                if(addBtn) {
                   addBtn.addEventListener('click', () => {
                       if (tabId === 'khachhang') showAddCustomerModal(() => renderTabContent('khachhang'));
                       if (tabId === 'ncc') showAddSupplierModal();
                       if (tabId === 'nsx') showAddNsxModal();
                   });
                }
            } catch (error) {
                tabContainer.innerHTML = `<div style="color: var(--danger-color);"><p><strong>Lỗi khi tải dữ liệu:</strong> ${error.message}</p></div>`;
            }
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                renderTabContent(e.currentTarget.dataset.tab);
            });
        });

        renderTabContent('thuoc');
    }

    async function renderDanhMucThuoc(container) {
        let searchTerm = '';
        let allData; 
        try {
            allData = await getCachedDanhMuc('DanhMucThuoc');

            const updateView = () => {
                const lowerCaseSearchTerm = searchTerm.toLowerCase();
                const filteredData = allData.filter(thuoc => 
                    thuoc.TenThuoc.toLowerCase().includes(lowerCaseSearchTerm) ||
                    thuoc.MaThuoc.toLowerCase().includes(lowerCaseSearchTerm) ||
                    (thuoc.HoatChat && thuoc.HoatChat.toLowerCase().includes(lowerCaseSearchTerm))
                );

                const totalPages = Math.ceil(filteredData.length / dmThuocItemsPerPage);
                if (dmThuocCurrentPage > totalPages) dmThuocCurrentPage = totalPages || 1;
                
                const startIndex = (dmThuocCurrentPage - 1) * dmThuocItemsPerPage;
                const endIndex = startIndex + dmThuocItemsPerPage;
                const paginatedData = filteredData.slice(startIndex, endIndex);

                const tableRows = paginatedData.length > 0
                    ? paginatedData.map(t => `
                        <tr data-ma-thuoc="${t.MaThuoc}">
                            <td>${t.MaThuoc}</td>
                            <td>${t.TenThuoc}</td>
                            <td>${t.HoatChat}</td>
                            <td>${t.DonViCoSo}</td>
                            <td class="action-cell">
                                <div class="action-menu">
                                    <button class="btn-actions">...</button>
                                    <div class="action-menu-dropdown">
                                        <a href="#" class="action-item" data-action="copy">Copy thuốc</a>
                                        <a href="#" class="action-item" data-action="edit">Sửa</a>
                                        <a href="#" class="action-item" data-action="delete">Xóa</a>
                                    </div>
                                </div>
                            </td>
                        </tr>`).join('')
                    : `<tr><td colspan="5" style="text-align:center;">Không tìm thấy kết quả.</td></tr>`;

                container.innerHTML = `
                    <div class="card-header">
                        <h3 style="margin:0;">Danh mục thuốc</h3>
                        <input type="search" id="thuoc-search" placeholder="Tìm kiếm thuốc..." value="${searchTerm}" style="width: 250px;"/>
                        <button class="btn btn-primary" id="add-new-drug-btn">Thêm thuốc mới</button>
                    </div>
                    <div class="table-wrapper">
                        <table>
                            <thead><tr><th>Mã thuốc</th><th>Tên thuốc</th><th>Hoạt chất</th><th>Đơn vị cơ sở</th><th class="action-cell">Hành động</th></tr></thead>
                            <tbody id="danh-muc-thuoc-tbody">${tableRows}</tbody>
                        </table>
                    </div>
                    <div class="pagination" style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                        <span>Hiển thị ${startIndex + 1}-${Math.min(endIndex, filteredData.length)} của ${filteredData.length} kết quả</span>
                        <div>
                            <button class="btn btn-secondary" id="prev-page" ${dmThuocCurrentPage === 1 ? 'disabled' : ''}>Trang trước</button>
                            <span style="margin: 0 10px;">Trang ${dmThuocCurrentPage} / ${totalPages || 1}</span>
                            <button class="btn btn-secondary" id="next-page" ${dmThuocCurrentPage >= totalPages ? 'disabled' : ''}>Trang sau</button>
                        </div>
                    </div>
                `;
                
                document.getElementById('danh-muc-thuoc-tbody').addEventListener('click', e => {
                    if (e.target.classList.contains('action-item')) {
                        e.preventDefault();
                        const action = e.target.dataset.action;
                        const maThuoc = e.target.closest('tr').dataset.maThuoc;
                        const drugData = allData.find(d => d.MaThuoc === maThuoc);
                        if (action === 'copy') {
                           const { MaThuoc, ...copyData } = drugData; // Exclude MaThuoc for copying
                           showAddThuocModal(null, () => { renderDanhMucThuoc(container); }, copyData);
                        } else {
                           showToast(`Chức năng "${action}" cho thuốc ${maThuoc} đang được phát triển.`, 'info');
                        }
                    }
                });

                document.getElementById('thuoc-search').addEventListener('input', (e) => {
                    searchTerm = e.target.value;
                    dmThuocCurrentPage = 1; 
                    updateView();
                });
                
                document.getElementById('add-new-drug-btn').addEventListener('click', () => {
                    showAddThuocModal(null, () => {
                        renderDanhMucThuoc(container);
                    });
                });

                document.getElementById('prev-page').addEventListener('click', () => {
                    if (dmThuocCurrentPage > 1) {
                        dmThuocCurrentPage--;
                        updateView();
                    }
                });

                document.getElementById('next-page').addEventListener('click', () => {
                    if (dmThuocCurrentPage < totalPages) {
                        dmThuocCurrentPage++;
                        updateView();
                    }
                });
            };

            updateView();
        } catch (error) {
            container.innerHTML = `<div style="color: var(--danger-color);"><p><strong>Lỗi khi tải dữ liệu thuốc:</strong> ${error.message}</p></div>`;
        }
    }
    
    // --- PRINTING & DETAIL VIEW ---
    async function renderPhieuNhapDetailForModal(maPN) {
        try {
            const { phieuNhap, chiTiet } = await callAppsScript('getPhieuNhapDetail', { maPhieuNhap: maPN });
            return `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
                    <p><strong>Mã phiếu:</strong> ${phieuNhap.MaPhieuNhap}</p>
                    <p><strong>Nhà cung cấp:</strong> ${phieuNhap.TenNhaCungCap}</p>
                    <p><strong>Ngày nhập:</strong> ${new Date(phieuNhap.NgayNhap).toLocaleString('vi-VN')}</p>
                    <p><strong>Tổng tiền:</strong> ${phieuNhap.TongTien.toLocaleString('vi-VN')}đ</p>
                </div>
                <h4>Chi tiết hàng hóa:</h4>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Tên thuốc</th><th>Đơn vị</th><th>Số lượng</th><th>Đơn giá</th><th>VAT (%)</th><th>Số lô</th><th>HSD</th><th>Thành tiền</th></tr></thead>
                        <tbody>
                        ${chiTiet.map(item => `
                            <tr>
                                <td>${item.TenThuoc}</td>
                                <td>${item.DonViNhap}</td>
                                <td>${item.SoLuongNhap}</td>
                                <td>${item.DonGiaNhap.toLocaleString('vi-VN')}đ</td>
                                <td>${item.VAT || item.vat || 0}</td>
                                <td>${item.SoLo}</td>
                                <td>${new Date(item.HanSuDung).toLocaleDateString('vi-VN')}</td>
                                <td>${item.ThanhTien.toLocaleString('vi-VN')}đ</td>
                            </tr>
                        `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            return `<p style="color:red;">Lỗi tải chi tiết: ${error.message}</p>`;
        }
    }

    async function printPhieuNhap(maPN) {
        showToast('Đang chuẩn bị phiếu in...', 'info');
        try {
            const { phieuNhap, chiTiet } = await callAppsScript('getPhieuNhapDetail', { maPhieuNhap: maPN });
            const printWindow = window.open('', '_blank');
            printWindow.document.write('<html><head><title>Phiếu Nhập Kho ' + maPN + '</title>');
            printWindow.document.write(`
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1, h2 { text-align: center; }
                    .info { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .total { text-align: right; font-weight: bold; }
                    .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; text-align: center; }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write('<h1>PHIẾU NHẬP KHO</h1>');
            printWindow.document.write(`<div class="info">
                <p><strong>Mã phiếu:</strong> ${phieuNhap.MaPhieuNhap}</p>
                <p><strong>Nhà cung cấp:</strong> ${phieuNhap.TenNhaCungCap}</p>
                <p><strong>Ngày nhập:</strong> ${new Date(phieuNhap.NgayNhap).toLocaleString('vi-VN')}</p>
            </div>`);
            printWindow.document.write('<table><thead><tr><th>STT</th><th>Tên thuốc</th><th>Đơn vị</th><th>SL</th><th>Đơn giá</th><th>VAT (%)</th><th>Số lô</th><th>HSD</th><th>Thành tiền</th></tr></thead><tbody>');
            chiTiet.forEach((item, index) => {
                printWindow.document.write(`
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.TenThuoc}</td>
                        <td>${item.DonViNhap}</td>
                        <td>${item.SoLuongNhap}</td>
                        <td>${item.DonGiaNhap.toLocaleString('vi-VN')}</td>
                        <td>${item.VAT || item.vat || 0}</td>
                        <td>${item.SoLo}</td>
                        <td>${new Date(item.HanSuDung).toLocaleDateString('vi-VN')}</td>
                        <td class="total">${item.ThanhTien.toLocaleString('vi-VN')}</td>
                    </tr>
                `);
            });
            printWindow.document.write(`<tr><td colspan="8" class="total">Tổng cộng</td><td class="total">${phieuNhap.TongTien.toLocaleString('vi-VN')}đ</td></tr>`);
            printWindow.document.write('</tbody></table>');
            printWindow.document.write(`<div class="footer">
                <div><p><strong>Người lập phiếu</strong></p><br><br><p>(Ký, họ tên)</p></div>
                <div><p><strong>Thủ kho</strong></p><br><br><p>(Ký, họ tên)</p></div>
            </div>`);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.print();
        } catch(error) {
            showToast(`Lỗi khi tạo phiếu in: ${error.message}`, 'error');
        }
    }

    async function renderXuatTraNCC() {
        updatePageTitle('Xuất trả Nhà cung cấp');
        mainContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Danh sách phiếu xuất trả NCC</h3>
                    <button class="btn btn-primary" id="btn-tao-phieu-xuat-tra">Tạo Phiếu Xuất Trả</button>
                </div>
                <div class="card-body table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Mã Phiếu</th>
                                <th>Ngày Xuất</th>
                                <th>Nhà Cung Cấp</th>
                                <th>Tổng Tiền</th>
                                <th class="action-cell">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                           <tr><td colspan="5" style="text-align: center; padding: 20px;">Chưa có dữ liệu. Chức năng đang được phát triển.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function renderXuatHuy() {
        updatePageTitle('Xuất Hủy');
        mainContent.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Danh sách phiếu xuất hủy</h3>
                    <button class="btn btn-primary" id="btn-tao-phieu-xuat-huy">Tạo Phiếu Xuất Hủy</button>
                </div>
                <div class="card-body table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Mã Phiếu</th>
                                <th>Ngày Hủy</th>
                                <th>Người Lập</th>
                                <th>Lý Do</th>
                                <th class="action-cell">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                           <tr><td colspan="5" style="text-align: center; padding: 20px;">Chưa có dữ liệu. Chức năng đang được phát triển.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }


    return {
        tongquan: renderDashboard,
        danhsachthuockho: renderDanhSachThuocKho,
        danhsachphieunhap: renderDanhSachPhieuNhap,
        xuatrancc: renderXuatTraNCC,
        xuathuy: renderXuatHuy,
        nhapkho: renderNhapKhoPage,
        "nhapkho-edit": renderEditNhapKhoPage,
        danhmuc: renderDanhMuc,
        soquy: () => renderPlaceholder('Sổ quỹ', 'Chức năng quản lý thu chi, công nợ.'),
        baocao: () => renderPlaceholder('Báo cáo', 'Xem các báo cáo doanh thu, lợi nhuận, hàng tồn kho.'),
    };
}