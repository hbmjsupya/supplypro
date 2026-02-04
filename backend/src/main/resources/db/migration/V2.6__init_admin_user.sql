INSERT INTO users (username, password, email, phone, status) 
VALUES ('admin', '$2a$10$fRh2fYbUFYaILgvUc3DHructelB9juVGRBBFhCnRUNpzDK15q/1Mm', 'admin@supplypro.com', '13800138000', 'ACTIVE');
-- Password is: password

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN';
