# Raw model strategies

This file explains where and how to use populate and serialize strategies

## POST request BODY validation

To validate body in POST or PATCH request add following code:

```typescript
    @Validation({ dto: Project })
    @UseGuards(ValidationGuard)
```

For dto, it is possible to use .model.ts or .dto.ts file. Important part here is, that dto class must extend ModelBase class.

You can add specific populate strategy in @Validation decorator. By default, PopulateFrom.PROFILE is used and if user is admin, then ValidationGuard also populates model with PopulateFrom.Admin strategy.

```typescript
    @Validation({ dto: Project, populateFrom: PopulateFrom.ADMIN })
    @UseGuards(ValidationGuard)
```

So, for properties that has no limitation and can be populated for everyone, add PopulateFrom.PROFILE:

```typescript
@prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ]
  })
  public name: string;
```

For properties, that can only be set by admin, use following code:

```typescript
@prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ]
  })
  public project_uuid: string;
```

## Populating model in service

In services, models should be populated with ModelBase.populateByStrategies method, which accepts multiple population strategies.
Eg. ordinary user, will have only Profile on the other hand, admin will have both: PROFILE & ADMIN.
Population strategies are defined in DevConsoleApiContext.

Use case:

```typescript
    async updateProject(
        context: DevConsoleApiContext,
        id: number,
        data: any,
    ): Promise<Project> {
        const project: Project = await new Project({}, context).populateById(id);
        if (!project.exists()) {
        throw new CodeException({
            code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
            status: HttpStatus.NOT_FOUND,
            errorCodes: ResourceNotFoundErrorCode,
        });
        }

        project.populateByStrategies(data, context.modelPopulationStrategies);

        try {
        await project.validate();
        } catch (err) {
        await project.handle(err);
        if (!project.isValid())
            throw new ValidationException(project, ValidatorErrorCode);
        }

        await project.update();
        return project;
    }
```

## Response serialization

When API returns model istance as response, ResponseInterceptor filters response to return only properties that have required serialization strategies.
