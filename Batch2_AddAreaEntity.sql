BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113100735_AddAreaEntity'
)
BEGIN
    CREATE TABLE [Areas] (
        [AreaId] int NOT NULL IDENTITY,
        [AreaName] nvarchar(200) NOT NULL,
        [AreaType] nvarchar(30) NOT NULL,
        [ParentAreaId] int NULL,
        [Code] nvarchar(50) NULL,
        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
        CONSTRAINT [PK_Areas] PRIMARY KEY ([AreaId]),
        CONSTRAINT [FK_Areas_Areas_ParentAreaId] FOREIGN KEY ([ParentAreaId]) REFERENCES [Areas] ([AreaId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113100735_AddAreaEntity'
)
BEGIN
    CREATE INDEX [IX_Areas_AreaName] ON [Areas] ([AreaName]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113100735_AddAreaEntity'
)
BEGIN
    CREATE INDEX [IX_Areas_AreaType] ON [Areas] ([AreaType]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113100735_AddAreaEntity'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Areas_Code] ON [Areas] ([Code]) WHERE [Code] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113100735_AddAreaEntity'
)
BEGIN
    CREATE INDEX [IX_Areas_ParentAreaId] ON [Areas] ([ParentAreaId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261113100735_AddAreaEntity'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261113100735_AddAreaEntity', N'10.0.14');
END;

COMMIT;
GO

