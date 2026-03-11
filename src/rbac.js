/**
 * RBAC (Role-Based Access Control) Utility Module
 * Handles permission checking, role management, and authorization logic
 */

// ===== SUPER ADMIN EMAIL =====
const SUPER_ADMIN_EMAIL = 'admin@patientpulse.com';

let pool; // Will be initialized by setPool()

/**
 * Initialize the pool connection
 * @param {Pool} pgPool - PostgreSQL pool instance
 */
function setPool(pgPool) {
    pool = pgPool;
}

/**
 * Check if user is Super Admin - has God Mode (all permissions)
 * @param {string} userEmail - User email address
 * @returns {Promise<boolean>} - True if super admin
 */
async function isSuperAdmin(userEmail) {
    return userEmail === SUPER_ADMIN_EMAIL;
}

/**
 * Get all roles for a user
 * @param {number} adminId - Admin ID
 * @returns {Promise<Array>} - Array of role objects
 */
async function getUserRoles(adminId) {
    try {
        const result = await pool.query(
            `SELECT r.role_id, r.role_name, r.description, r.is_locked 
             FROM roles r
             INNER JOIN admin_roles ar ON r.role_id = ar.role_id
             WHERE ar.admin_id = $1`,
            [adminId]
        );
        return result.rows;
    } catch (err) {
        console.error('Error fetching user roles:', err);
        return [];
    }
}

/**
 * Get all permissions for a user
 * @param {number} adminId - Admin ID
 * @returns {Promise<Array>} - Array of permission objects
 */
async function getUserPermissions(adminId) {
    try {
        // Get permissions from both role-based and direct admin permissions
        const result = await pool.query(
            `SELECT DISTINCT p.permission_id, p.permission_name, p.permission_key, p.description, p.category
             FROM permissions p
             LEFT JOIN role_permissions rp ON p.permission_id = rp.permission_id
             LEFT JOIN admin_roles ar ON rp.role_id = ar.role_id
             LEFT JOIN admin_permissions ap ON p.permission_id = ap.permission_id
             WHERE ar.admin_id = $1 OR ap.admin_id = $1
             ORDER BY p.category, p.permission_name`,
            [adminId]
        );
        return result.rows;
    } catch (err) {
        console.error('Error fetching user permissions:', err);
        return [];
    }
}

/**
 * Check if a user has a specific permission
 * Super Admin bypasses all checks
 * @param {number} adminId - Admin ID
 * @param {string} userEmail - User email
 * @param {string} permissionKey - Permission key to check
 * @returns {Promise<boolean>} - True if user has permission
 */
async function hasPermission(adminId, userEmail, permissionKey) {
    try {
        // Super Admin always has all permissions
        if (await isSuperAdmin(userEmail)) {
            return true;
        }

        // Check if user has the permission through their roles
        const result = await pool.query(
            `SELECT COUNT(*) as count
             FROM role_permissions rp
             INNER JOIN admin_roles ar ON rp.role_id = ar.role_id
             INNER JOIN permissions p ON rp.permission_id = p.permission_id
             WHERE ar.admin_id = $1 AND p.permission_key = $2`,
            [adminId, permissionKey]
        );

        return result.rows[0].count > 0;
    } catch (err) {
        console.error('Error checking permission:', err);
        return false;
    }
}

/**
 * Get full role details with permissions
 * @param {number} roleId - Role ID
 * @returns {Promise<Object>} - Role object with permissions array
 */
async function getRoleWithPermissions(roleId) {
    try {
        const roleResult = await pool.query(
            'SELECT * FROM roles WHERE role_id = $1',
            [roleId]
        );

        if (roleResult.rows.length === 0) {
            return null;
        }

        const role = roleResult.rows[0];

        const permResult = await pool.query(
            `SELECT p.* FROM permissions p
             INNER JOIN role_permissions rp ON p.permission_id = rp.permission_id
             WHERE rp.role_id = $1`,
            [roleId]
        );

        role.permissions = permResult.rows;
        return role;
    } catch (err) {
        console.error('Error fetching role with permissions:', err);
        return null;
    }
}

/**
 * Get all permissions grouped by category
 * @returns {Promise<Object>} - Object with categories as keys
 */
async function getAllPermissionsGrouped() {
    try {
        const result = await pool.query(
            'SELECT * FROM permissions ORDER BY category, permission_name'
        );

        const grouped = {};
        result.rows.forEach(permission => {
            if (!grouped[permission.category]) {
                grouped[permission.category] = [];
            }
            grouped[permission.category].push(permission);
        });

        return grouped;
    } catch (err) {
        console.error('Error fetching grouped permissions:', err);
        return {};
    }
}

/**
 * Update permissions for a role
 * Cannot modify Super Admin role
 * @param {number} roleId - Role ID
 * @param {Array<number>} permissionIds - Array of permission IDs to grant
 * @returns {Promise<Object>} - Result object
 */
async function updateRolePermissions(roleId, permissionIds) {
    const client = await pool.connect();
    try {
        // Check if role is locked (Super Admin)
        const roleCheck = await client.query(
            'SELECT is_locked FROM roles WHERE role_id = $1',
            [roleId]
        );

        if (roleCheck.rows.length === 0) {
            return { success: false, message: 'Role not found' };
        }

        if (roleCheck.rows[0].is_locked) {
            return { success: false, message: 'Cannot modify Super Admin role' };
        }

        // Start transaction
        await client.query('BEGIN');

        // Delete existing permissions for the role
        await client.query(
            'DELETE FROM role_permissions WHERE role_id = $1',
            [roleId]
        );

        // Insert new permissions
        if (permissionIds && permissionIds.length > 0) {
            const insertQuery = `
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ${permissionIds.map((_, i) => `($1, $${i + 2})`).join(',')}
            `;
            const values = [roleId, ...permissionIds];
            await client.query(insertQuery, values);
        }

        // Commit transaction
        await client.query('COMMIT');

        return { success: true, message: 'Permissions updated successfully' };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating role permissions:', err);
        return { success: false, message: 'Database error: ' + err.message };
    } finally {
        client.release();
    }
}

/**
 * Permission check middleware for Express routes
 * @param {string} requiredPermission - Permission key to check
 * @returns {Function} - Express middleware
 */
function requirePermission(requiredPermission) {
    return async (req, res, next) => {
        try {
            const adminId = req.session.adminId || req.query.adminId;
            const userEmail = req.session.userEmail || req.query.userEmail;

            if (!adminId || !userEmail) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const hasPerms = await hasPermission(adminId, userEmail, requiredPermission);

            if (!hasPerms) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions for this action'
                });
            }

            next();
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Permission check failed'
            });
        }
    };
}

/**
 * Get all admins with their roles
 * @returns {Promise<Array>} - Array of admin objects with roles
 */
async function getAllAdminsWithRoles() {
    try {
        const result = await pool.query(
            `SELECT DISTINCT a.id, a.email, a.name, a.created_at,
                    r.role_id, r.role_name, r.is_locked,
                    s.department, s.status
             FROM admins a
             LEFT JOIN admin_roles ar ON a.id = ar.admin_id
             LEFT JOIN roles r ON ar.role_id = r.role_id
             LEFT JOIN staff s ON a.email = s.email
             ORDER BY a.email, r.role_name`
        );

        // Group by admin
        const admins = {};
        result.rows.forEach(row => {
            if (!admins[row.id]) {
                admins[row.id] = {
                    id: row.id,
                    email: row.email,
                    name: row.name,
                    created_at: row.created_at,
                    department: row.department || 'N/A',
                    status: row.status || 'Active',
                    roles: []
                };
            }
            if (row.role_id) {
                admins[row.id].roles.push({
                    role_id: row.role_id,
                    role_name: row.role_name,
                    is_locked: row.is_locked
                });
            }
        });

        return Object.values(admins);
    } catch (err) {
        console.error('Error fetching admins with roles:', err);
        return [];
    }
}

// Export functions
module.exports = {
    setPool,
    SUPER_ADMIN_EMAIL,
    isSuperAdmin,
    getUserRoles,
    getUserPermissions,
    hasPermission,
    getRoleWithPermissions,
    getAllPermissionsGrouped,
    updateRolePermissions,
    requirePermission,
    getAllAdminsWithRoles
};
