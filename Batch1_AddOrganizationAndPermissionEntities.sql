BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    DROP INDEX [IX_Roles_RoleName] ON [Roles];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    ALTER TABLE [Roles] ADD [Description] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    ALTER TABLE [Roles] ADD [IsSystemDefined] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    ALTER TABLE [Roles] ADD [OrganizationId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE TABLE [Organizations] (
        [OrganizationId] int NOT NULL IDENTITY,
        [OrganizationName] nvarchar(200) NOT NULL,
        [OrganizationType] nvarchar(50) NOT NULL,
        [RegistrationNumber] nvarchar(100) NULL,
        [Description] nvarchar(2000) NULL,
        [Email] nvarchar(256) NULL,
        [PhoneNumber] nvarchar(20) NULL,
        [Address] nvarchar(500) NULL,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Organizations] PRIMARY KEY ([OrganizationId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE TABLE [Permissions] (
        [PermissionId] int NOT NULL IDENTITY,
        [PermissionName] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NULL,
        CONSTRAINT [PK_Permissions] PRIMARY KEY ([PermissionId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE TABLE [OrganizationMemberships] (
        [MembershipId] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [OrganizationId] int NOT NULL,
        [MembershipStatus] nvarchar(30) NOT NULL DEFAULT N'Pending',
        [JoinedAt] datetime2 NOT NULL,
        [ApprovedAt] datetime2 NULL,
        [ApprovedByUserId] int NULL,
        CONSTRAINT [PK_OrganizationMemberships] PRIMARY KEY ([MembershipId]),
        CONSTRAINT [AK_OrganizationMemberships_MembershipId_OrganizationId] UNIQUE ([MembershipId], [OrganizationId]),
        CONSTRAINT [FK_OrganizationMemberships_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([OrganizationId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_OrganizationMemberships_Users_ApprovedByUserId] FOREIGN KEY ([ApprovedByUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_OrganizationMemberships_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE TABLE [RolePermissions] (
        [RolePermissionId] int NOT NULL IDENTITY,
        [RoleId] int NOT NULL,
        [PermissionId] int NOT NULL,
        CONSTRAINT [PK_RolePermissions] PRIMARY KEY ([RolePermissionId]),
        CONSTRAINT [FK_RolePermissions_Permissions_PermissionId] FOREIGN KEY ([PermissionId]) REFERENCES [Permissions] ([PermissionId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_RolePermissions_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([RoleId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE TABLE [OrganizationMembershipRoles] (
        [MembershipRoleId] int NOT NULL IDENTITY,
        [MembershipId] int NOT NULL,
        [RoleId] int NOT NULL,
        [OrganizationId] int NOT NULL,
        [AssignedAt] datetime2 NOT NULL,
        [AssignedByUserId] int NULL,
        CONSTRAINT [PK_OrganizationMembershipRoles] PRIMARY KEY ([MembershipRoleId]),
        CONSTRAINT [FK_OrganizationMembershipRoles_OrganizationMemberships_MembershipId_OrganizationId] FOREIGN KEY ([MembershipId], [OrganizationId]) REFERENCES [OrganizationMemberships] ([MembershipId], [OrganizationId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_OrganizationMembershipRoles_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([RoleId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_OrganizationMembershipRoles_Users_AssignedByUserId] FOREIGN KEY ([AssignedByUserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Roles_OrganizationId_RoleName] ON [Roles] ([OrganizationId], [RoleName]) WHERE [OrganizationId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Roles_RoleName] ON [Roles] ([RoleName]) WHERE [OrganizationId] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    EXEC(N'ALTER TABLE [Roles] ADD CONSTRAINT [CK_Roles_SystemDefined_MustBeGlobal] CHECK ([IsSystemDefined] = 0 OR [OrganizationId] IS NULL)');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_OrganizationMembershipRoles_AssignedByUserId] ON [OrganizationMembershipRoles] ([AssignedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_OrganizationMembershipRoles_MembershipId_OrganizationId] ON [OrganizationMembershipRoles] ([MembershipId], [OrganizationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE UNIQUE INDEX [IX_OrganizationMembershipRoles_MembershipId_RoleId] ON [OrganizationMembershipRoles] ([MembershipId], [RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_OrganizationMembershipRoles_RoleId] ON [OrganizationMembershipRoles] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_OrganizationMemberships_ApprovedByUserId] ON [OrganizationMemberships] ([ApprovedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_OrganizationMemberships_MembershipStatus] ON [OrganizationMemberships] ([MembershipStatus]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_OrganizationMemberships_OrganizationId] ON [OrganizationMemberships] ([OrganizationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE UNIQUE INDEX [IX_OrganizationMemberships_UserId_OrganizationId] ON [OrganizationMemberships] ([UserId], [OrganizationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_Organizations_IsActive] ON [Organizations] ([IsActive]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_Organizations_OrganizationType] ON [Organizations] ([OrganizationType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Organizations_RegistrationNumber] ON [Organizations] ([RegistrationNumber]) WHERE [RegistrationNumber] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Permissions_PermissionName] ON [Permissions] ([PermissionName]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE INDEX [IX_RolePermissions_PermissionId] ON [RolePermissions] ([PermissionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RolePermissions_RoleId_PermissionId] ON [RolePermissions] ([RoleId], [PermissionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    ALTER TABLE [Roles] ADD CONSTRAINT [FK_Roles_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([OrganizationId]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261106070804_AddOrganizationAndPermissionEntities'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261106070804_AddOrganizationAndPermissionEntities', N'10.0.14');
END;

COMMIT;
GO

