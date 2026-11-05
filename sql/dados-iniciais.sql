-- ==========================================
-- Catálogo inicial. O backend só roda este arquivo quando o banco
-- ainda não tem nenhuma categoria (primeira vez).
-- As fotos ficam em frontend/public/products.
-- ==========================================

INSERT INTO categorias (nome, descricao) VALUES
    ('Material Básico', 'Cimento, areia, brita e tijolos'),
    ('Hidráulica', 'Tubos, conexões e registros'),
    ('Elétrica', 'Fios, disjuntores e tomadas'),
    ('Tintas', 'Tintas, massas e acessórios');

INSERT INTO produtos (categoria_id, nome, descricao, unidade, imagem_url, ativo) VALUES
    ((SELECT id FROM categorias WHERE nome = 'Material Básico'), 'Cimento CP II 50kg', 'Cimento Portland uso geral', 'saco', '/products/cimento-votoran-cp2-50kg.jpg', true),
    ((SELECT id FROM categorias WHERE nome = 'Material Básico'), 'Areia Média (m³)', 'Areia lavada por m³', 'm³', '/products/areia-fina-lavada.jpg', true),
    ((SELECT id FROM categorias WHERE nome = 'Material Básico'), 'Tijolo Baiano (milheiro)', 'Tijolo cerâmico 8 furos', 'milheiro', '/products/tijolo-baiano-6-furos.jpg', true),
    ((SELECT id FROM categorias WHERE nome = 'Hidráulica'), 'Tubo PVC 25mm 6m', 'Tubo soldável água fria', 'barra', '/products/tubo-pvc.jpg', true),
    ((SELECT id FROM categorias WHERE nome = 'Hidráulica'), 'Registro de Gaveta 3/4"', 'Registro metálico', 'un', '/products/registro-gaveta.jpg', true),
    ((SELECT id FROM categorias WHERE nome = 'Elétrica'), 'Cabo Flexível 2,5mm² 100m', 'Rolo de 100 metros', 'rolo', '/products/cabo-flexivel.jpg', true),
    ((SELECT id FROM categorias WHERE nome = 'Elétrica'), 'Disjuntor 20A', 'Disjuntor DIN monopolar', 'un', '/products/disjuntor.jpg', true),
    ((SELECT id FROM categorias WHERE nome = 'Tintas'), 'Tinta Acrílica Branca 18L', 'Tinta fosca premium', 'lata', '/products/tinta-acrilica.jpg', true),
    ((SELECT id FROM categorias WHERE nome = 'Tintas'), 'Massa Corrida 25kg', 'Massa PVA para interiores', 'saco', '/products/massa-corrida.jpg', true);
