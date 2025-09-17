document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL APP OBJECT ---
    // Centralized place for shared state and functions
    window.app = {};
    
    // --- DOM ELEMENTS ---
    const loadingIndicator = document.getElementById('loading-indicator');
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const modalContainer = document.getElementById('modal-container');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const connectionStatusEl = document.getElementById('connection-status');
    const statusTextEl = document.getElementById('status-text');
    const configErrorBanner = document.getElementById('config-error-banner');
    const toastContainer = document.getElementById('toast-container');
    const userMenu = document.getElementById('user-menu');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');


    // --- API & STATE MANAGEMENT ---
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzPHH4geoZvXXxlBlXGwQ-cWVmEbOqfeaEgx41cqhkWfJe6_cd8TQAzyDFli72L24aJjw/exec';

    let appState = {
        currentUser: null,
        cache: {},
    };
    window.app.state = appState;

    // --- CONSTANTS ---
    const VIETNAM_BANKS = [
        { name: 'Ngân hàng TMCP An Bình (ABBANK)', bin: '970425' },
        { name: 'Ngân hàng TMCP Á Châu (ACB)', bin: '970416' },
        { name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)', bin: '970405' },
        { name: 'Ngân hàng TMCP Bảo Việt (BaoViet Bank)', bin: '970438' },
        { name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)', bin: '970418' },
        { name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam (Eximbank)', bin: '970431' },
        { name: 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu (GPBank)', bin: '970408' },
        { name: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh (HDBank)', bin: '970437' },
        { name: 'Ngân hàng TMCP Kiên Long (Kienlongbank)', bin: '970452' },
        { name: 'Ngân hàng TMCP Lộc Phát Việt Nam (LPBank)', bin: '970449' },
        { name: 'Ngân hàng TMCP Quân đội (MBBank)', bin: '970422' },
        { name: 'Ngân hàng TMCP Hàng Hải (MSB)', bin: '970426' },
        { name: 'Ngân hàng TMCP Nam Á (NamA Bank)', bin: '970428' },
        { name: 'Ngân hàng TMCP Phương Đông (OCB)', bin: '970448' },
        { name: 'Ngân hàng TMCP Đại Chúng Việt Nam (PVComBank)', bin: '970412' },
        { name: 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)', bin: '970403' },
        { name: 'Ngân hàng TMCP Sài Gòn Công Thương (Saigonbank)', bin: '970400' },
        { name: 'Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)', bin: '970443' },
        { name: 'gân hàng TMCP Đông Nam Á (SeABank)', bin: '970440' },
        { name: 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)', bin: '970407' },
        { name: 'Ngân hàng TMCP Tiên Phong (TPBank)', bin: '970423' },
        { name: 'Ngân hàng TMCP Quốc tế Việt Nam (VIB Bank)', bin: '970441' },
        { name: 'Ngân hàng TMCP Việt Á (VietABank)', bin: '970427' },
        { name: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)', bin: '970436' },
        { name: 'Ngân hàng TMCP Công thương Việt Nam (VietinBank)', bin: '970415' },
        { name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)', bin: '970432' },
        { name: 'VNPT Money', bin: '971011' },
        { name: 'Viettel Money', bin: '971005' }
    ].sort((a, b) => a.name.localeCompare(b.name));

    const handleConfigurationCheck = () => {
        if (!GAS_URL || GAS_URL.includes('PASTE_YOUR')) {
            if (configErrorBanner) configErrorBanner.classList.remove('hidden');
            return true;
        }
        if (configErrorBanner) configErrorBanner.classList.add('hidden');
        return false;
    };
    
    const callAppsScript = async (functionName, args = {}) => {
        if (handleConfigurationCheck()) {
            throw new Error("Lỗi cấu hình: GAS_URL chưa được cập nhật.");
        }
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify({ functionName, args }),
                redirect: 'follow'
            });

            const contentType = response.headers.get("content-type");
            if (!response.ok || (contentType && contentType.indexOf("application/json") === -1)) {
                const errorText = await response.text();
                console.error("Lỗi Backend GAS:", errorText);
                if (errorText.includes('accounts.google.com')) {
                    throw new Error("Lỗi Phân Quyền. Vui lòng kiểm tra cài đặt triển khai Google Apps Script. Đảm bảo 'Ai có quyền truy cập' được đặt là 'Bất kỳ ai'.");
                }
                throw new Error(`Lỗi từ backend. Phản hồi không phải là JSON (Status: ${response.status}). Vui lòng kiểm tra log trong Google Apps Script.`);
            }

            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message);
            return result.data;
        } catch (error) {
            console.error(`Lỗi khi gọi hàm '${functionName}':`, error);
            if (error.message.includes("Failed to fetch")) {
                 throw new Error("Không thể kết nối tới backend. Vui lòng kiểm tra lại GAS_URL và kết nối mạng.");
            }
            throw error;
        }
    };
    window.app.callAppsScript = callAppsScript;
    
    const getCachedDanhMuc = async (tenDanhMuc, forceRefresh = false) => {
        if (!forceRefresh && appState.cache[tenDanhMuc]) return appState.cache[tenDanhMuc];
        const data = await callAppsScript('getDanhMuc', { tenDanhMuc });
        appState.cache[tenDanhMuc] = data;
        return data;
    };
    window.app.getCachedDanhMuc = getCachedDanhMuc;

    const invalidateCache = (tenDanhMuc) => {
        if (appState.cache[tenDanhMuc]) delete appState.cache[tenDanhMuc];
    };
    window.app.invalidateCache = invalidateCache;

    // --- TOAST & MODAL (SHARED UI) ---
    const showToast = (message, type = 'info', duration = 5000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    };
    window.app.showToast = showToast;

    const showModal = (title, content, options = {}) => {
        const { isClosable = true, size = '600px' } = options;
        const modalContentEl = modalContainer.querySelector('.modal-content');
        if (modalContentEl) modalContentEl.style.maxWidth = size;

        modalBody.innerHTML = `<h2>${title}</h2>` + content;
        modalContainer.classList.remove('hidden');
        modalCloseBtn.style.display = isClosable ? 'block' : 'none';
        
        const closeModalHandler = (e) => {
            if (e.target === modalContainer || e.target === modalCloseBtn || e.key === 'Escape') {
                 if (isClosable) {
                    hideModal();
                 }
            }
        };

        modalContainer.addEventListener('click', closeModalHandler);
        modalCloseBtn.addEventListener('click', closeModalHandler);
        window.addEventListener('keydown', closeModalHandler, { once: true });

    };
    window.app.showModal = showModal;

    const hideModal = () => modalContainer.classList.add('hidden');
    window.app.hideModal = hideModal;
    
    const closeModalOnOutsideClick = (e) => {
        if (e.target === modalContainer) hideModal();
    };
    
    window.app.generateOptions = (data, valueField, textField, selectedValue, addNewText) => {
        let optionsHtml = data.map(item =>
            `<option value="${item[valueField]}" ${selectedValue === item[valueField] ? 'selected' : ''}>${item[textField]}</option>`
        ).join('');
        if (addNewText) {
            optionsHtml += `<option value="--add-new--">${addNewText}</option>`;
        }
        return optionsHtml;
    };


    // --- CONNECTION STATUS ---
    const checkConnectionStatus = async () => {
        if (!connectionStatusEl || !statusTextEl) return;
        if (handleConfigurationCheck()) {
            connectionStatusEl.className = 'connection-status offline';
            statusTextEl.textContent = 'Lỗi Cấu hình';
            return;
        }
        connectionStatusEl.className = 'connection-status checking';
        statusTextEl.textContent = 'Đang kiểm tra...';
        try {
            await callAppsScript('checkConnection');
            connectionStatusEl.className = 'connection-status online';
            statusTextEl.textContent = 'Online';
        } catch (error) {
            connectionStatusEl.className = 'connection-status offline';
            statusTextEl.textContent = 'Offline';
        }
    };

    // --- AUTHENTICATION & RBAC ---
    const showLogin = () => {
        loginContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
        if (loginForm) loginForm.reset();
        const errorEl = document.getElementById('login-error');
        if (errorEl) errorEl.classList.add('hidden');
    };

    const preloadData = async () => {
        showToast('Đang tải dữ liệu nền...', 'info');
        try {
            const promises = [
                getCachedDanhMuc('DanhMucThuoc'),
                getCachedDanhMuc('DonViQuyDoi'),
                getCachedDanhMuc('DanhMucKhachHang'),
                getCachedDanhMuc('DanhMucNhaCungCap'),
                getCachedDanhMuc('DanhMucNhaSanXuat'),
            ];
            // Only fetch settings if not already cached
            if (!appState.cache['appSettings']) {
                promises.push(
                    callAppsScript('getAppSettings').then(settings => {
                        appState.cache['appSettings'] = settings;
                    })
                );
            }
            await Promise.all(promises);
            showToast('Dữ liệu đã sẵn sàng!', 'success');
        } catch (error) {
            showToast(`Lỗi tải dữ liệu nền: ${error.message}`, 'error');
        }
    };

    const showApp = async () => {
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');

        try {
            appState.cache['appSettings'] = await callAppsScript('getAppSettings');
        } catch (e) {
            console.error("Không thể tải cài đặt ứng dụng:", e);
            showToast("Không thể tải cài đặt ứng dụng.", "error");
        }
        
        const settings = appState.cache['appSettings'] || {};
        const pharmacyNameEl = document.getElementById('sidebar-pharmacy-name');
        if (pharmacyNameEl && settings.TenNhaThuoc) {
            pharmacyNameEl.textContent = settings.TenNhaThuoc;
        }

        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting && appState.currentUser) {
            userGreeting.textContent = `Chào, ${appState.currentUser.HoTen || 'Dược sĩ'}`;
        }

        applyRBAC();
        await checkConnectionStatus();
        handleHashChange();
        await preloadData();
    };


    const applyRBAC = () => {
        const userRole = appState.currentUser?.Quyen || '';
        const navVisibility = {
            'Admin': ['tongquan', 'banhang', 'hoadon', 'kho', 'danhsachphieunhap', 'xuatrancc', 'xuathuy', 'soquy', 'baocao', 'danhmuc', 'quantri'],
            'Quản trị': ['tongquan', 'banhang', 'hoadon', 'kho', 'danhsachphieunhap', 'xuatrancc', 'xuathuy', 'soquy', 'baocao', 'danhmuc', 'quantri'],
            'Bán hàng': ['tongquan', 'banhang', 'hoadon', 'soquy', 'baocao', 'danhmuc'],
            'Kho': ['tongquan', 'hoadon', 'kho', 'danhsachphieunhap', 'xuatrancc', 'xuathuy', 'soquy', 'baocao', 'danhmuc'],
        };
        const allowedPages = navVisibility[userRole] || [];
        document.querySelectorAll('.sidebar-nav [data-page]').forEach(link => {
            const page = link.dataset.page;
            const parentLi = link.closest('li');
            parentLi.style.display = allowedPages.includes(page) ? '' : 'none';
        });

        // Hide parent group if all children are hidden
        document.querySelectorAll('.nav-item-group').forEach(group => {
            const subLinks = group.querySelectorAll('.sub-menu a[data-page]');
            const isAnyVisible = Array.from(subLinks).some(sl => allowedPages.includes(sl.dataset.page));
            group.style.display = isAnyVisible ? '' : 'none';
        });
    };

    const hasPermission = (pageId) => {
        const userRole = appState.currentUser?.Quyen || '';
        const navVisibility = {
            'Admin': ['tongquan', 'banhang', 'hoadon', 'kho', 'danhsachphieunhap', 'xuatrancc', 'xuathuy', 'soquy', 'baocao', 'danhmuc', 'quantri', 'nhapkho', 'nhapkho-edit'],
            'Quản trị': ['tongquan', 'banhang', 'hoadon', 'kho', 'danhsachphieunhap', 'xuatrancc', 'xuathuy', 'soquy', 'baocao', 'danhmuc', 'quantri', 'nhapkho', 'nhapkho-edit'],
            'Bán hàng': ['tongquan', 'banhang', 'hoadon', 'soquy', 'baocao', 'danhmuc'],
            'Kho': ['tongquan', 'hoadon', 'kho', 'danhsachphieunhap', 'xuatrancc', 'xuathuy', 'soquy', 'baocao', 'danhmuc', 'nhapkho', 'nhapkho-edit'],
        };
        const allowedPages = navVisibility[userRole] || [];
        return allowedPages.includes(pageId);
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { username, password } = e.target.elements;
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const errorEl = document.getElementById('login-error');

        errorEl.classList.add('hidden');
        submitButton.disabled = true;
        submitButton.textContent = 'Đang đăng nhập...';

        try {
            const result = await callAppsScript('loginUser', {
                username: username.value,
                password: password.value
            });

            if (result.success) {
                appState.currentUser = result.user;
                // Store session in sessionStorage
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));

                if (result.user.PhaiDoiMatKhau) {
                    showForcePasswordChangeModal();
                } else {
                    await showApp();
                }
            }
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Đăng nhập';
        }
    });

    const showForcePasswordChangeModal = () => {
        const content = `
            <p>Đây là lần đăng nhập đầu tiên của bạn. Vui lòng đổi mật khẩu để tiếp tục.</p>
            <form id="force-change-password-form">
                <div class="input-group">
                    <label for="new-password">Mật khẩu mới</label>
                    <input type="password" id="new-password" required minlength="4">
                </div>
                <div class="input-group">
                    <label for="confirm-password">Xác nhận mật khẩu mới</label>
                    <input type="password" id="confirm-password" required minlength="4">
                </div>
                <p id="password-error" class="hidden" style="color: var(--danger-color);"></p>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Lưu mật khẩu</button>
                </div>
            </form>
        `;
        showModal('Đổi Mật Khẩu Bắt Buộc', content, { isClosable: false });

        document.getElementById('force-change-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const errorEl = document.getElementById('password-error');
            const submitBtn = e.target.querySelector('button');

            if (newPassword !== confirmPassword) {
                errorEl.textContent = 'Mật khẩu xác nhận không khớp.';
                errorEl.classList.remove('hidden');
                return;
            }
            errorEl.classList.add('hidden');
            submitBtn.disabled = true;

            try {
                await callAppsScript('changePassword', {
                    TenDangNhap: appState.currentUser.TenDangNhap,
                    newPassword: newPassword,
                });
                showToast('Đổi mật khẩu thành công!', 'success');
                appState.currentUser.PhaiDoiMatKhau = false;
                // Update session storage after password change
                sessionStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
                hideModal();
                await showApp();
            } catch (error) {
                errorEl.textContent = `Lỗi: ${error.message}`;
                errorEl.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
            }
        });
    };

    const showUserInfoModal = () => {
        const user = appState.currentUser;
        if (!user) return;
        const content = `
            <div style="display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: center;">
                <strong>Mã nhân viên:</strong><span>${user.MaNhanVien || 'N/A'}</span>
                <strong>Họ và tên:</strong><span>${user.HoTen || 'N/A'}</span>
                <strong>Tên đăng nhập:</strong><span>${user.TenDangNhap || 'N/A'}</span>
                <strong>Chức vụ:</strong><span>${user.ChucVu || 'N/A'}</span>
                <strong>Quyền:</strong><span>${user.Quyen || 'N/A'}</span>
            </div>
            <div style="text-align: right; margin-top: 20px;">
                <button class="btn btn-primary" onclick="window.app.hideModal()">Đóng</button>
            </div>
        `;
        showModal('Thông tin cá nhân', content, { size: '500px' });
    };

    const showChangePasswordModal = () => {
        const content = `
            <form id="change-password-form">
                <div class="input-group">
                    <label for="old-password">Mật khẩu cũ</label>
                    <input type="password" id="old-password" required>
                </div>
                <div class="input-group">
                    <label for="new-password">Mật khẩu mới</label>
                    <input type="password" id="new-password" required minlength="4">
                </div>
                <div class="input-group">
                    <label for="confirm-new-password">Xác nhận mật khẩu mới</label>
                    <input type="password" id="confirm-new-password" required minlength="4">
                </div>
                <p id="password-change-error" class="hidden" style="color: var(--danger-color);"></p>
                <div style="text-align: right; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="window.app.hideModal()">Hủy</button>
                    <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
                </div>
            </form>
        `;
        showModal('Đổi Mật Khẩu', content, { size: '500px' });
    
        document.getElementById('change-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPassword = document.getElementById('old-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;
            const errorEl = document.getElementById('password-change-error');
            const submitBtn = e.target.querySelector('button[type="submit"]');
    
            errorEl.classList.add('hidden');
    
            if (newPassword !== confirmNewPassword) {
                errorEl.textContent = 'Mật khẩu mới không khớp.';
                errorEl.classList.remove('hidden');
                return;
            }
    
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang lưu...';
    
            try {
                await callAppsScript('updateMyPassword', {
                    username: appState.currentUser.TenDangNhap,
                    oldPassword: oldPassword,
                    newPassword: newPassword
                });
                showToast('Đổi mật khẩu thành công!', 'success');
                hideModal();
            } catch (error) {
                errorEl.textContent = `Lỗi: ${error.message}`;
                errorEl.classList.remove('hidden');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Lưu thay đổi';
            }
        });
    };


    // --- PAGE RENDERERS (CORE) ---
    const updatePageTitle = (title) => pageTitle.textContent = title;

    const renderQuantriUsers = (container) => {
        container.innerHTML = `<p>Đang tải danh sách người dùng...</p>`;
        callAppsScript('getNhanSuList')
            .then(users => {
                container.innerHTML = `
                    <div class="card-header">
                        <h3>Quản lý người dùng</h3>
                        <button class="btn btn-primary" id="btn-add-user">Thêm người dùng</button>
                    </div>
                    <div class="card-body table-wrapper">
                        <table>
                            <thead><tr><th>Mã NV</th><th>Họ Tên</th><th>Tên đăng nhập</th><th>Chức vụ</th><th>Quyền</th></tr></thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td>${u.MaNhanVien}</td>
                                        <td>${u.HoTen}</td>
                                        <td>${u.TenDangNhap}</td>
                                        <td>${u.ChucVu}</td>
                                        <td>${u.Quyen}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                document.getElementById('btn-add-user').addEventListener('click', showAddUserModal);
            })
            .catch(error => {
                container.innerHTML = `<div style="color: var(--danger-color);"><p><strong>Lỗi tải dữ liệu:</strong> ${error.message}</p></div>`;
            });
    };

    const renderQuantriSettings = (container) => {
        container.innerHTML = `<p>Đang tải cài đặt...</p>`;
        callAppsScript('getAppSettings')
            .then(settings => {
                const bankOptions = VIETNAM_BANKS.map(bank => 
                    `<option value="${bank.name}" data-bin="${bank.bin}" ${settings.TenNganHang === bank.name ? 'selected' : ''}>${bank.name}</option>`
                ).join('');

                container.innerHTML = `
                    <div class="card-header"><h3>Cài đặt chung</h3></div>
                    <div class="card-body">
                        <form id="app-settings-form">
                            <h4>Thông tin nhà thuốc (hiển thị trên hóa đơn)</h4>
                            <div class="input-group"><label for="setting-TenNhaThuoc">Tên nhà thuốc</label><input type="text" id="setting-TenNhaThuoc" value="${settings.TenNhaThuoc || ''}"></div>
                            <div class="input-group"><label for="setting-DiaChi">Địa chỉ</label><input type="text" id="setting-DiaChi" value="${settings.DiaChi || ''}"></div>
                            <div class="input-group"><label for="setting-SoDienThoai">Số điện thoại</label><input type="text" id="setting-SoDienThoai" value="${settings.SoDienThoai || ''}"></div>
                            <hr style="margin: 20px 0;">
                            <h4>Thông tin thanh toán (dùng cho mã VietQR)</h4>
                            <div class="input-group">
                                <label for="setting-TenNganHang">Ngân hàng</label>
                                <select id="setting-TenNganHang">
                                    <option value="">-- Chọn ngân hàng --</option>
                                    ${bankOptions}
                                </select>
                            </div>
                            <div class="input-group">
                                <label for="setting-MaNganHangBIN">Mã BIN ngân hàng</label>
                                <input type="text" id="setting-MaNganHangBIN" placeholder="Mã BIN sẽ tự động điền" value="${settings.MaNganHangBIN || ''}" readonly style="background-color: #e9ecef;">
                            </div>
                            <div class="input-group"><label for="setting-SoTaiKhoan">Số tài khoản</label><input type="text" id="setting-SoTaiKhoan" value="${settings.SoTaiKhoan || ''}"></div>
                            <div class="input-group"><label for="setting-TenChuTaiKhoan">Tên chủ tài khoản</label><input type="text" id="setting-TenChuTaiKhoan" placeholder="VD: NGUYEN VAN A" value="${settings.TenChuTaiKhoan || ''}"><small>Tên viết IN HOA, không dấu.</small></div>
                            <div style="text-align: right; margin-top: 20px;">
                                <button type="submit" class="btn btn-primary">Lưu thay đổi</button>
                            </div>
                        </form>
                    </div>
                `;

                const bankSelect = document.getElementById('setting-TenNganHang');
                const binInput = document.getElementById('setting-MaNganHangBIN');
                
                bankSelect.addEventListener('change', (e) => {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    binInput.value = selectedOption.dataset.bin || '';
                });

                document.getElementById('app-settings-form').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const submitBtn = e.target.querySelector('button[type="submit"]');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Đang lưu...';

                    const newSettings = {
                        TenNhaThuoc: document.getElementById('setting-TenNhaThuoc').value,
                        DiaChi: document.getElementById('setting-DiaChi').value,
                        SoDienThoai: document.getElementById('setting-SoDienThoai').value,
                        TenNganHang: document.getElementById('setting-TenNganHang').value,
                        MaNganHangBIN: document.getElementById('setting-MaNganHangBIN').value,
                        SoTaiKhoan: document.getElementById('setting-SoTaiKhoan').value,
                        TenChuTaiKhoan: document.getElementById('setting-TenChuTaiKhoan').value,
                    };

                    try {
                        await callAppsScript('updateAppSettings', { settings: newSettings });
                        appState.cache['appSettings'] = newSettings; // Update local cache
                        showToast('Cập nhật cài đặt thành công!', 'success');
                        
                        // Update sidebar name immediately
                        const pharmacyNameEl = document.getElementById('sidebar-pharmacy-name');
                        if (pharmacyNameEl && newSettings.TenNhaThuoc) {
                            pharmacyNameEl.textContent = newSettings.TenNhaThuoc;
                        }
                    } catch (error) {
                        showToast(`Lỗi: ${error.message}`, 'error');
                    } finally {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Lưu thay đổi';
                    }
                });
            })
            .catch(error => {
                container.innerHTML = `<div style="color: var(--danger-color);"><p><strong>Lỗi tải cài đặt:</strong> ${error.message}</p></div>`;
            });
    };

    function renderQuantri() {
        updatePageTitle('Quản trị');
        mainContent.innerHTML = `
            <div class="card">
                <div class="tabs" id="quantri-tabs">
                    <button class="tab-link active" data-tab="users">Quản lý người dùng</button>
                    <button class="tab-link" data-tab="settings">Cài đặt chung</button>
                </div>
                <div id="quantri-content"></div>
            </div>
        `;

        const tabContainer = document.getElementById('quantri-content');
        const tabs = document.querySelectorAll('#quantri-tabs .tab-link');
        
        const renderTabContent = (tabId) => {
            if (tabId === 'users') {
                renderQuantriUsers(tabContainer);
            } else if (tabId === 'settings') {
                renderQuantriSettings(tabContainer);
            }
        };

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                renderTabContent(e.currentTarget.dataset.tab);
            });
        });

        // Initial render
        renderTabContent('users');
    }

    const showAddUserModal = () => {
        const content = `
            <form id="add-user-form">
                <div class="input-group"><label for="new-user-hoten">Họ Tên</label><input type="text" id="new-user-hoten" required></div>
                <div class="input-group"><label for="new-user-tendangnhap">Tên đăng nhập</label><input type="text" id="new-user-tendangnhap" required></div>
                <div class="input-group"><label for="new-user-chucvu">Chức vụ</label><input type="text" id="new-user-chucvu"></div>
                <div class="input-group">
                    <label for="new-user-quyen">Quyền</label>
                    <select id="new-user-quyen" required>
                        <option value="">-- Chọn quyền --</option>
                        <option value="Quản trị">Quản trị</option>
                        <option value="Bán hàng">Bán hàng</option>
                        <option value="Kho">Kho</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="window.app.hideModal()">Hủy</button>
                    <button type="submit" class="btn btn-primary">Lưu</button>
                </div>
            </form>
        `;
        showModal('Thêm Người Dùng Mới', content);

        document.getElementById('add-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            try {
                const userData = {
                    HoTen: document.getElementById('new-user-hoten').value,
                    TenDangNhap: document.getElementById('new-user-tendangnhap').value,
                    ChucVu: document.getElementById('new-user-chucvu').value,
                    Quyen: document.getElementById('new-user-quyen').value
                };
                await callAppsScript('createUser', userData);
                showToast('Tạo người dùng thành công! Mật khẩu mặc định là 1111.', 'success');
                hideModal();
                renderQuantri(); // Refresh user list
            } catch (error) {
                showToast(`Lỗi: ${error.message}`, 'error');
            } finally {
                submitBtn.disabled = false;
            }
        });
    };

    // --- ROUTING ---
    const pageRenderers = {
        quantri: renderQuantri,
    };

    const navigateTo = (pageId, params) => {
        if (!hasPermission(pageId)) {
            showToast('Bạn không có quyền truy cập trang này.', 'error');
            window.location.hash = 'tongquan';
            return;
        }

        // Update nav link active states
        const pageToHighlight = pageId.startsWith('nhapkho') ? 'danhsachphieunhap' : pageId;

        navLinks.forEach(link => {
            link.classList.remove('active');
            const parentGroup = link.closest('.nav-item-group');
            if (parentGroup) parentGroup.classList.remove('open');
        });

        const activeLink = document.querySelector(`.nav-link[data-page="${pageToHighlight}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            const parentGroup = activeLink.closest('.nav-item-group');
            if (parentGroup) {
                parentGroup.classList.add('open');
                parentGroup.querySelector('.has-submenu').classList.add('active');
                parentGroup.querySelector('.sub-menu').style.display = 'block';
            }
        }
        
        const pageRenderer = pageRenderers[pageId] || (() => {
            const title = pageId.charAt(0).toUpperCase() + pageId.slice(1);
            updatePageTitle(title);
            mainContent.innerHTML = `<div class="card"><h2>Trang không tồn tại hoặc đang phát triển</h2><p>Chức năng cho '${pageId}' chưa được định nghĩa.</p></div>`;
        });
        pageRenderer(params);
    };

    const handleHashChange = () => {
        const hash = window.location.hash.substring(1) || 'tongquan';
        const [pageId, queryString] = hash.split('?');
        const params = new URLSearchParams(queryString);
        navigateTo(pageId, params);
    };
    
    // --- INITIALIZATION ---
    async function initializeApp() {
        if (handleConfigurationCheck()) {
            checkConnectionStatus();
            loadingIndicator.classList.add('hidden');
            return;
        }
    
        try {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                appState.currentUser = JSON.parse(storedUser);
                await showApp();
            } else {
                showLogin();
            }
        } catch (error) {
            console.error("Lỗi khi khởi tạo session:", error);
            sessionStorage.removeItem('currentUser'); // Clear corrupted data
            showLogin();
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    if (typeof initializePharmacyModule === 'function') {
        const pharmacyRenderers = initializePharmacyModule(window.app);
        Object.assign(pageRenderers, pharmacyRenderers);
    } else {
        console.error("Lỗi: không tìm thấy `initializePharmacyModule`. File scriptKho.js có thể chưa được tải.");
    }

    if (typeof initializeSalesModule === 'function') {
        const salesRenderers = initializeSalesModule(window.app);
        Object.assign(pageRenderers, salesRenderers);
    } else {
        console.error("Lỗi: không tìm thấy `initializeSalesModule`. File scriptBanhang.js có thể chưa được tải.");
    }

    window.addEventListener('hashchange', handleHashChange);
    connectionStatusEl.addEventListener('click', checkConnectionStatus);

    document.querySelectorAll('.has-submenu').forEach(menu => {
        menu.addEventListener('click', e => {
            e.preventDefault();
            const parent = menu.closest('.nav-item-group');
            const submenu = menu.nextElementSibling;
            
            if (parent.classList.contains('open')) {
                submenu.style.display = 'none';
                parent.classList.remove('open');
            } else {
                submenu.style.display = 'block';
                parent.classList.add('open');
            }
        });
    });
    
    // Global click listener to handle action menus
    document.addEventListener('click', e => {
        const clickedActionMenuButton = e.target.closest('.btn-actions');
        const openMenus = document.querySelectorAll('.action-menu-dropdown.show');
        let clickedMenuWasOpen = false;

        // First, close all currently open menus and reset their wrappers
        openMenus.forEach(menu => {
            // Check if the menu being closed is the one that was just clicked
            if (clickedActionMenuButton && menu === clickedActionMenuButton.nextElementSibling) {
                clickedMenuWasOpen = true;
            }
            menu.classList.remove('show');
            const tableWrapper = menu.closest('.table-wrapper');
            if (tableWrapper) {
                 tableWrapper.style.overflow = ''; // Reset overflow
            }
        });

        // If a menu button was clicked AND it wasn't already open, open it.
        if (clickedActionMenuButton && !clickedMenuWasOpen) {
            const dropdown = clickedActionMenuButton.nextElementSibling;
            const tableWrapper = clickedActionMenuButton.closest('.table-wrapper');
            
            dropdown.classList.add('show');
            if (tableWrapper) {
                // Use a more specific overflow property to avoid affecting vertical scroll
                tableWrapper.style.overflow = 'visible';
            }
        }
    });

    // --- USER MENU DROPDOWN LOGIC ---
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenuDropdown.classList.toggle('show');
    });
    userMenuDropdown.addEventListener('click', (e) => e.stopPropagation());
    window.addEventListener('click', () => {
        if (userMenuDropdown.classList.contains('show')) {
            userMenuDropdown.classList.remove('show');
        }
    });

    document.body.addEventListener('click', e => {
        const target = e.target.closest('a.dropdown-item');
        if (!target) return;
    
        userMenuDropdown.classList.remove('show');

        if (target.id === 'logout-btn') {
            e.preventDefault();
            appState.currentUser = null;
            sessionStorage.removeItem('currentUser'); // Clear session on logout
            window.location.hash = '';
            showLogin();
        } else if (target.id === 'user-info-btn') {
            e.preventDefault();
            showUserInfoModal();
        } else if (target.id === 'change-password-btn') {
            e.preventDefault();
            showChangePasswordModal();
        }
    });


    initializeApp();
});