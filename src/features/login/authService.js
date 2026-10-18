export const authService = {
    login: async ({ account, password, rememberMe }) => {
        return new Promise((resolve, reject) => {
            if (!account || !password) {
                return reject(new Error('Vui lòng nhập đầy đủ tài khoản và mật khẩu'));
            }

            if (account.trim() === 'admin' && password.trim() === 'admin') {
                const fakeResponse = {
                    status: 200,
                    token: 'jwt-smart-parking-token-xyz790',
                    user: {
                        id: 'USR-01',
                        name: 'Huy',
                        account: account.trim(),
                        role: 'ADMIN',
                    },
                };

                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem('sp_auth_token', fakeResponse.token);
                storage.setItem('sp_user', JSON.stringify(fakeResponse.user));

                resolve(fakeResponse);
            } else {
                reject(new Error('Email, số điện thoại hoặc mật khẩu không chính xác'));
            }
        })
    },

    loginWithFetch: async ({ account, password, rememberMe }) => {
        return fetch('API', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                account: account.trim(),
                password: password,
            }),
        }).then(async (res) => {
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Đăng nhập thất bại');
            }
            return res.json();
        }).then((data) => {
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('sp_auth_token', data.token);
            return data;
        })
    },

    forgotPassword: async (account) => {
        return new Promise((resolve, reject) => {
            if (!account) {
                return reject(new Error('Vui lòng cung cấp email hoặc số điện thoại'));
            }

            return resolve({message: "Mã xác nhập OTP đã được gửi thành công"});
        })
    },

    logout: () => {
        return new Promise((resolve) => {
            localStorage.removeItem('sp_auth_token');
            localStorage.removeItem('sp_user');
            sessionStorage.removeItem('sp_auth_token');
            sessionStorage.removeItem('sp_user');
            resolve(true);
        });
    }
};