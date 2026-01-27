INSERT INTO users (username, password, email, phone, status) 
VALUES ('admin', '$2a$10$N.zmdr9k7uOCQb376NoUnutj8iAt6aBECYn.e.s7i.3lG.2.3.6', 'admin@supplypro.com', '13800138000', 'ACTIVE');
-- Password is: password

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN';
