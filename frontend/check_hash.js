const bcrypt = require('bcryptjs');

const password = 'Admin@123';
const hashFromFile = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Compare
bcrypt.compare(password, hashFromFile).then((res) => {
    console.log(`Matching '${password}' against hash '${hashFromFile}': ${res}`);

    // Generate new hash just in case
    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(password, salt);
    console.log(`New hash for '${password}': ${newHash}`);
});
