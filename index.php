<?php
header('Content-Type: application/json');

// Подключение к базе данных
$db = new mysqli('localhost', 'wallet112', 'Walletmonster', 'telegram_wallet');

if ($db->connect_error) {
    die("Connection failed: " . $db->connect_error);
}

// Получение данных от Telegram Web App
$input = json_decode(file_get_contents('php://input'), true);
$initData = $input['initData'] ?? '';

// Парсинг initData для получения user данных
parse_str($initData, $parsedData);
$userData = json_decode($parsedData['user'] ?? '{}', true);

$telegramId = $userData['id'] ?? null;
$response = ['ok' => false];

if ($telegramId) {
    // Проверяем или создаем пользователя
    $user = getUserOrCreate($db, $telegramId, $userData);
    
    // Обработка команд
    $command = $input['command'] ?? '';
    
    switch ($command) {
        case 'get_balance':
            $response = getBalance($db, $user['id']);
            break;
        case 'add_transaction':
            $response = addTransaction($db, $user['id'], $input['data']);
            break;
        case 'get_transactions':
            $response = getTransactions($db, $user['id'], $input['data'] ?? []);
            break;
        case 'get_categories':
            $response = getCategories($db, $user['id']);
            break;
        default:
            $response = ['ok' => true, 'user' => $user];
    }
}

echo json_encode($response);

// Функции работы с базой данных
function getUserOrCreate($db, $telegramId, $userData) {
    $stmt = $db->prepare("SELECT * FROM users WHERE telegram_id = ?");
    $stmt->bind_param("i", $telegramId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    
    $stmt = $db->prepare("INSERT INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", 
        $telegramId,
        $userData['username'] ?? '',
        $userData['first_name'] ?? '',
        $userData['last_name'] ?? ''
    );
    $stmt->execute();
    
    return [
        'id' => $stmt->insert_id,
        'telegram_id' => $telegramId,
        'username' => $userData['username'] ?? '',
        'first_name' => $userData['first_name'] ?? '',
        'last_name' => $userData['last_name'] ?? ''
    ];
}

function getBalance($db, $userId) {
    $income = getSumByType($db, $userId, 'income');
    $expense = getSumByType($db, $userId, 'expense');
    
    return [
        'ok' => true,
        'balance' => $income - $expense,
        'income' => $income,
        'expense' => $expense
    ];
}

function getSumByType($db, $userId, $type) {
    $stmt = $db->prepare("
        SELECT COALESCE(SUM(t.amount), 0) as total 
        FROM transactions t
        JOIN categories c ON t.category = c.name
        WHERE c.user_id = ? AND c.type = ?
    ");
    $stmt->bind_param("is", $userId, $type);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    return $row['total'] ?? 0;
}

function addTransaction($db, $userId, $data) {
    $stmt = $db->prepare("INSERT INTO transactions (user_id, amount, category, description) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("idss", $userId, $data['amount'], $data['category'], $data['description'] ?? '');
    $success = $stmt->execute();
    
    return ['ok' => $success, 'balance' => getBalance($db, $userId)];
}

function getTransactions($db, $userId, $filters) {
    $query = "SELECT t.* FROM transactions t WHERE t.user_id = ?";
    $params = [$userId];
    $types = "i";
    
    if (!empty($filters['category'])) {
        $query .= " AND t.category = ?";
        $params[] = $filters['category'];
        $types .= "s";
    }
    
    if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
        $query .= " AND t.transaction_date BETWEEN ? AND ?";
        $params[] = $filters['start_date'];
        $params[] = $filters['end_date'];
        $types .= "ss";
    }
    
    $query .= " ORDER BY t.transaction_date DESC LIMIT 100";
    
    $stmt = $db->prepare($query);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = $row;
    }
    
    return ['ok' => true, 'transactions' => $transactions];
}

function getCategories($db, $userId) {
    $stmt = $db->prepare("SELECT * FROM categories WHERE user_id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = $row;
    }
    
    // Добавляем стандартные категории, если их нет
    if (empty($categories)) {
        $defaultCategories = [
            ['name' => 'Еда', 'type' => 'expense'],
            ['name' => 'Транспорт', 'type' => 'expense'],
            ['name' => 'Развлечения', 'type' => 'expense'],
            ['name' => 'Зарплата', 'type' => 'income'],
            ['name' => 'Подарки', 'type' => 'income']
        ];
        
        foreach ($defaultCategories as $category) {
            $stmt = $db->prepare("INSERT INTO categories (user_id, name, type) VALUES (?, ?, ?)");
            $stmt->bind_param("iss", $userId, $category['name'], $category['type']);
            $stmt->execute();
            $categories[] = ['id' => $stmt->insert_id, ...$category];
        }
    }
    
    return ['ok' => true, 'categories' => $categories];
}
?>
