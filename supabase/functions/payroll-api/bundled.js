// supabase/functions/payroll-api/index.ts
import { createClient } from "npm:@supabase/supabase-js@2.112.3";

// node_modules/drizzle-orm/entity.js
var entityKind = /* @__PURE__ */ Symbol.for("drizzle:entityKind");
function is(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(
      `Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`
    );
  }
  let cls = Object.getPrototypeOf(value).constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}

// node_modules/drizzle-orm/column.js
var Column = class {
  constructor(table, config) {
    this.table = table;
    this.config = config;
    this.name = config.name;
    this.keyAsName = config.keyAsName;
    this.notNull = config.notNull;
    this.default = config.default;
    this.defaultFn = config.defaultFn;
    this.onUpdateFn = config.onUpdateFn;
    this.hasDefault = config.hasDefault;
    this.primary = config.primaryKey;
    this.isUnique = config.isUnique;
    this.uniqueName = config.uniqueName;
    this.uniqueType = config.uniqueType;
    this.dataType = config.dataType;
    this.columnType = config.columnType;
    this.generated = config.generated;
    this.generatedIdentity = config.generatedIdentity;
  }
  static [entityKind] = "Column";
  name;
  keyAsName;
  primary;
  notNull;
  default;
  defaultFn;
  onUpdateFn;
  hasDefault;
  isUnique;
  uniqueName;
  uniqueType;
  dataType;
  columnType;
  enumValues = void 0;
  generated = void 0;
  generatedIdentity = void 0;
  config;
  mapFromDriverValue(value) {
    return value;
  }
  mapToDriverValue(value) {
    return value;
  }
  // ** @internal */
  shouldDisableInsert() {
    return this.config.generated !== void 0 && this.config.generated.type !== "byDefault";
  }
};

// node_modules/drizzle-orm/column-builder.js
var ColumnBuilder = class {
  static [entityKind] = "ColumnBuilder";
  config;
  constructor(name, dataType, columnType) {
    this.config = {
      name,
      keyAsName: name === "",
      notNull: false,
      default: void 0,
      hasDefault: false,
      primaryKey: false,
      isUnique: false,
      uniqueName: void 0,
      uniqueType: void 0,
      dataType,
      columnType,
      generated: void 0
    };
  }
  /**
   * Changes the data type of the column. Commonly used with `json` columns. Also, useful for branded types.
   *
   * @example
   * ```ts
   * const users = pgTable('users', {
   * 	id: integer('id').$type<UserId>().primaryKey(),
   * 	details: json('details').$type<UserDetails>().notNull(),
   * });
   * ```
   */
  $type() {
    return this;
  }
  /**
   * Adds a `not null` clause to the column definition.
   *
   * Affects the `select` model of the table - columns *without* `not null` will be nullable on select.
   */
  notNull() {
    this.config.notNull = true;
    return this;
  }
  /**
   * Adds a `default <value>` clause to the column definition.
   *
   * Affects the `insert` model of the table - columns *with* `default` are optional on insert.
   *
   * If you need to set a dynamic default value, use {@link $defaultFn} instead.
   */
  default(value) {
    this.config.default = value;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Adds a dynamic default value to the column.
   * The function will be called when the row is inserted, and the returned value will be used as the column value.
   *
   * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
   */
  $defaultFn(fn) {
    this.config.defaultFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Alias for {@link $defaultFn}.
   */
  $default = this.$defaultFn;
  /**
   * Adds a dynamic update value to the column.
   * The function will be called when the row is updated, and the returned value will be used as the column value if none is provided.
   * If no `default` (or `$defaultFn`) value is provided, the function will be called when the row is inserted as well, and the returned value will be used as the column value.
   *
   * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
   */
  $onUpdateFn(fn) {
    this.config.onUpdateFn = fn;
    this.config.hasDefault = true;
    return this;
  }
  /**
   * Alias for {@link $onUpdateFn}.
   */
  $onUpdate = this.$onUpdateFn;
  /**
   * Adds a `primary key` clause to the column definition. This implicitly makes the column `not null`.
   *
   * In SQLite, `integer primary key` implicitly makes the column auto-incrementing.
   */
  primaryKey() {
    this.config.primaryKey = true;
    this.config.notNull = true;
    return this;
  }
  /** @internal Sets the name of the column to the key within the table definition if a name was not given. */
  setName(name) {
    if (this.config.name !== "") return;
    this.config.name = name;
  }
};

// node_modules/drizzle-orm/table.utils.js
var TableName = /* @__PURE__ */ Symbol.for("drizzle:Name");

// node_modules/drizzle-orm/pg-core/foreign-keys.js
var ForeignKeyBuilder = class {
  static [entityKind] = "PgForeignKeyBuilder";
  /** @internal */
  reference;
  /** @internal */
  _onUpdate = "no action";
  /** @internal */
  _onDelete = "no action";
  constructor(config, actions) {
    this.reference = () => {
      const { name, columns, foreignColumns } = config();
      return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
    };
    if (actions) {
      this._onUpdate = actions.onUpdate;
      this._onDelete = actions.onDelete;
    }
  }
  onUpdate(action) {
    this._onUpdate = action === void 0 ? "no action" : action;
    return this;
  }
  onDelete(action) {
    this._onDelete = action === void 0 ? "no action" : action;
    return this;
  }
  /** @internal */
  build(table) {
    return new ForeignKey(table, this);
  }
};
var ForeignKey = class {
  constructor(table, builder) {
    this.table = table;
    this.reference = builder.reference;
    this.onUpdate = builder._onUpdate;
    this.onDelete = builder._onDelete;
  }
  static [entityKind] = "PgForeignKey";
  reference;
  onUpdate;
  onDelete;
  getName() {
    const { name, columns, foreignColumns } = this.reference();
    const columnNames = columns.map((column) => column.name);
    const foreignColumnNames = foreignColumns.map((column) => column.name);
    const chunks = [
      this.table[TableName],
      ...columnNames,
      foreignColumns[0].table[TableName],
      ...foreignColumnNames
    ];
    return name ?? `${chunks.join("_")}_fk`;
  }
};

// node_modules/drizzle-orm/tracing-utils.js
function iife(fn, ...args) {
  return fn(...args);
}

// node_modules/drizzle-orm/pg-core/unique-constraint.js
function uniqueKeyName(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}
var UniqueConstraintBuilder = class {
  constructor(columns, name) {
    this.name = name;
    this.columns = columns;
  }
  static [entityKind] = "PgUniqueConstraintBuilder";
  /** @internal */
  columns;
  /** @internal */
  nullsNotDistinctConfig = false;
  nullsNotDistinct() {
    this.nullsNotDistinctConfig = true;
    return this;
  }
  /** @internal */
  build(table) {
    return new UniqueConstraint(table, this.columns, this.nullsNotDistinctConfig, this.name);
  }
};
var UniqueOnConstraintBuilder = class {
  static [entityKind] = "PgUniqueOnConstraintBuilder";
  /** @internal */
  name;
  constructor(name) {
    this.name = name;
  }
  on(...columns) {
    return new UniqueConstraintBuilder(columns, this.name);
  }
};
var UniqueConstraint = class {
  constructor(table, columns, nullsNotDistinct, name) {
    this.table = table;
    this.columns = columns;
    this.name = name ?? uniqueKeyName(this.table, this.columns.map((column) => column.name));
    this.nullsNotDistinct = nullsNotDistinct;
  }
  static [entityKind] = "PgUniqueConstraint";
  columns;
  name;
  nullsNotDistinct = false;
  getName() {
    return this.name;
  }
};

// node_modules/drizzle-orm/pg-core/utils/array.js
function parsePgArrayValue(arrayString, startFrom, inQuotes) {
  for (let i = startFrom; i < arrayString.length; i++) {
    const char2 = arrayString[i];
    if (char2 === "\\") {
      i++;
      continue;
    }
    if (char2 === '"') {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i + 1];
    }
    if (inQuotes) {
      continue;
    }
    if (char2 === "," || char2 === "}") {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i];
    }
  }
  return [arrayString.slice(startFrom).replace(/\\/g, ""), arrayString.length];
}
function parsePgNestedArray(arrayString, startFrom = 0) {
  const result = [];
  let i = startFrom;
  let lastCharIsComma = false;
  while (i < arrayString.length) {
    const char2 = arrayString[i];
    if (char2 === ",") {
      if (lastCharIsComma || i === startFrom) {
        result.push("");
      }
      lastCharIsComma = true;
      i++;
      continue;
    }
    lastCharIsComma = false;
    if (char2 === "\\") {
      i += 2;
      continue;
    }
    if (char2 === '"') {
      const [value2, startFrom2] = parsePgArrayValue(arrayString, i + 1, true);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    if (char2 === "}") {
      return [result, i + 1];
    }
    if (char2 === "{") {
      const [value2, startFrom2] = parsePgNestedArray(arrayString, i + 1);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    const [value, newStartFrom] = parsePgArrayValue(arrayString, i, false);
    result.push(value);
    i = newStartFrom;
  }
  return [result, i];
}
function parsePgArray(arrayString) {
  const [result] = parsePgNestedArray(arrayString, 1);
  return result;
}
function makePgArray(array) {
  return `{${array.map((item) => {
    if (Array.isArray(item)) {
      return makePgArray(item);
    }
    if (typeof item === "string") {
      return `"${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return `${item}`;
  }).join(",")}}`;
}

// node_modules/drizzle-orm/pg-core/columns/common.js
var PgColumnBuilder = class extends ColumnBuilder {
  foreignKeyConfigs = [];
  static [entityKind] = "PgColumnBuilder";
  array(size) {
    return new PgArrayBuilder(this.config.name, this, size);
  }
  references(ref, actions = {}) {
    this.foreignKeyConfigs.push({ ref, actions });
    return this;
  }
  unique(name, config) {
    this.config.isUnique = true;
    this.config.uniqueName = name;
    this.config.uniqueType = config?.nulls;
    return this;
  }
  generatedAlwaysAs(as) {
    this.config.generated = {
      as,
      type: "always",
      mode: "stored"
    };
    return this;
  }
  /** @internal */
  buildForeignKeys(column, table) {
    return this.foreignKeyConfigs.map(({ ref, actions }) => {
      return iife(
        (ref2, actions2) => {
          const builder = new ForeignKeyBuilder(() => {
            const foreignColumn = ref2();
            return { columns: [column], foreignColumns: [foreignColumn] };
          });
          if (actions2.onUpdate) {
            builder.onUpdate(actions2.onUpdate);
          }
          if (actions2.onDelete) {
            builder.onDelete(actions2.onDelete);
          }
          return builder.build(table);
        },
        ref,
        actions
      );
    });
  }
  /** @internal */
  buildExtraConfigColumn(table) {
    return new ExtraConfigColumn(table, this.config);
  }
};
var PgColumn = class extends Column {
  constructor(table, config) {
    if (!config.uniqueName) {
      config.uniqueName = uniqueKeyName(table, [config.name]);
    }
    super(table, config);
    this.table = table;
  }
  static [entityKind] = "PgColumn";
};
var ExtraConfigColumn = class extends PgColumn {
  static [entityKind] = "ExtraConfigColumn";
  getSQLType() {
    return this.getSQLType();
  }
  indexConfig = {
    order: this.config.order ?? "asc",
    nulls: this.config.nulls ?? "last",
    opClass: this.config.opClass
  };
  defaultConfig = {
    order: "asc",
    nulls: "last",
    opClass: void 0
  };
  asc() {
    this.indexConfig.order = "asc";
    return this;
  }
  desc() {
    this.indexConfig.order = "desc";
    return this;
  }
  nullsFirst() {
    this.indexConfig.nulls = "first";
    return this;
  }
  nullsLast() {
    this.indexConfig.nulls = "last";
    return this;
  }
  /**
   * ### PostgreSQL documentation quote
   *
   * > An operator class with optional parameters can be specified for each column of an index.
   * The operator class identifies the operators to be used by the index for that column.
   * For example, a B-tree index on four-byte integers would use the int4_ops class;
   * this operator class includes comparison functions for four-byte integers.
   * In practice the default operator class for the column's data type is usually sufficient.
   * The main point of having operator classes is that for some data types, there could be more than one meaningful ordering.
   * For example, we might want to sort a complex-number data type either by absolute value or by real part.
   * We could do this by defining two operator classes for the data type and then selecting the proper class when creating an index.
   * More information about operator classes check:
   *
   * ### Useful links
   * https://www.postgresql.org/docs/current/sql-createindex.html
   *
   * https://www.postgresql.org/docs/current/indexes-opclass.html
   *
   * https://www.postgresql.org/docs/current/xindex.html
   *
   * ### Additional types
   * If you have the `pg_vector` extension installed in your database, you can use the
   * `vector_l2_ops`, `vector_ip_ops`, `vector_cosine_ops`, `vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`, `halfvec_l2_ops`, `sparsevec_l2_ops` options, which are predefined types.
   *
   * **You can always specify any string you want in the operator class, in case Drizzle doesn't have it natively in its types**
   *
   * @param opClass
   * @returns
   */
  op(opClass) {
    this.indexConfig.opClass = opClass;
    return this;
  }
};
var IndexedColumn = class {
  static [entityKind] = "IndexedColumn";
  constructor(name, keyAsName, type, indexConfig) {
    this.name = name;
    this.keyAsName = keyAsName;
    this.type = type;
    this.indexConfig = indexConfig;
  }
  name;
  keyAsName;
  type;
  indexConfig;
};
var PgArrayBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgArrayBuilder";
  constructor(name, baseBuilder, size) {
    super(name, "array", "PgArray");
    this.config.baseBuilder = baseBuilder;
    this.config.size = size;
  }
  /** @internal */
  build(table) {
    const baseColumn = this.config.baseBuilder.build(table);
    return new PgArray(
      table,
      this.config,
      baseColumn
    );
  }
};
var PgArray = class _PgArray extends PgColumn {
  constructor(table, config, baseColumn, range) {
    super(table, config);
    this.baseColumn = baseColumn;
    this.range = range;
    this.size = config.size;
  }
  size;
  static [entityKind] = "PgArray";
  getSQLType() {
    return `${this.baseColumn.getSQLType()}[${typeof this.size === "number" ? this.size : ""}]`;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      value = parsePgArray(value);
    }
    return value.map((v) => this.baseColumn.mapFromDriverValue(v));
  }
  mapToDriverValue(value, isNestedArray = false) {
    const a = value.map(
      (v) => v === null ? null : is(this.baseColumn, _PgArray) ? this.baseColumn.mapToDriverValue(v, true) : this.baseColumn.mapToDriverValue(v)
    );
    if (isNestedArray) return a;
    return makePgArray(a);
  }
};

// node_modules/drizzle-orm/pg-core/columns/enum.js
var PgEnumObjectColumnBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgEnumObjectColumnBuilder";
  constructor(name, enumInstance) {
    super(name, "string", "PgEnumObjectColumn");
    this.config.enum = enumInstance;
  }
  /** @internal */
  build(table) {
    return new PgEnumObjectColumn(
      table,
      this.config
    );
  }
};
var PgEnumObjectColumn = class extends PgColumn {
  static [entityKind] = "PgEnumObjectColumn";
  enum;
  enumValues = this.config.enum.enumValues;
  constructor(table, config) {
    super(table, config);
    this.enum = config.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
};
var isPgEnumSym = /* @__PURE__ */ Symbol.for("drizzle:isPgEnum");
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}
var PgEnumColumnBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgEnumColumnBuilder";
  constructor(name, enumInstance) {
    super(name, "string", "PgEnumColumn");
    this.config.enum = enumInstance;
  }
  /** @internal */
  build(table) {
    return new PgEnumColumn(
      table,
      this.config
    );
  }
};
var PgEnumColumn = class extends PgColumn {
  static [entityKind] = "PgEnumColumn";
  enum = this.config.enum;
  enumValues = this.config.enum.enumValues;
  constructor(table, config) {
    super(table, config);
    this.enum = config.enum;
  }
  getSQLType() {
    return this.enum.enumName;
  }
};

// node_modules/drizzle-orm/subquery.js
var Subquery = class {
  static [entityKind] = "Subquery";
  constructor(sql2, fields, alias, isWith = false, usedTables = []) {
    this._ = {
      brand: "Subquery",
      sql: sql2,
      selectedFields: fields,
      alias,
      isWith,
      usedTables
    };
  }
  // getSQL(): SQL<unknown> {
  // 	return new SQL([this]);
  // }
};
var WithSubquery = class extends Subquery {
  static [entityKind] = "WithSubquery";
};

// node_modules/drizzle-orm/version.js
var version = "0.45.2";

// node_modules/drizzle-orm/tracing.js
var otel;
var rawTracer;
var tracer = {
  startActiveSpan(name, fn) {
    if (!otel) {
      return fn();
    }
    if (!rawTracer) {
      rawTracer = otel.trace.getTracer("drizzle-orm", version);
    }
    return iife(
      (otel2, rawTracer2) => rawTracer2.startActiveSpan(
        name,
        (span) => {
          try {
            return fn(span);
          } catch (e) {
            span.setStatus({
              code: otel2.SpanStatusCode.ERROR,
              message: e instanceof Error ? e.message : "Unknown error"
              // eslint-disable-line no-instanceof/no-instanceof
            });
            throw e;
          } finally {
            span.end();
          }
        }
      ),
      otel,
      rawTracer
    );
  }
};

// node_modules/drizzle-orm/view-common.js
var ViewBaseConfig = /* @__PURE__ */ Symbol.for("drizzle:ViewBaseConfig");

// node_modules/drizzle-orm/table.js
var Schema = /* @__PURE__ */ Symbol.for("drizzle:Schema");
var Columns = /* @__PURE__ */ Symbol.for("drizzle:Columns");
var ExtraConfigColumns = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigColumns");
var OriginalName = /* @__PURE__ */ Symbol.for("drizzle:OriginalName");
var BaseName = /* @__PURE__ */ Symbol.for("drizzle:BaseName");
var IsAlias = /* @__PURE__ */ Symbol.for("drizzle:IsAlias");
var ExtraConfigBuilder = /* @__PURE__ */ Symbol.for("drizzle:ExtraConfigBuilder");
var IsDrizzleTable = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleTable");
var Table = class {
  static [entityKind] = "Table";
  /** @internal */
  static Symbol = {
    Name: TableName,
    Schema,
    OriginalName,
    Columns,
    ExtraConfigColumns,
    BaseName,
    IsAlias,
    ExtraConfigBuilder
  };
  /**
   * @internal
   * Can be changed if the table is aliased.
   */
  [TableName];
  /**
   * @internal
   * Used to store the original name of the table, before any aliasing.
   */
  [OriginalName];
  /** @internal */
  [Schema];
  /** @internal */
  [Columns];
  /** @internal */
  [ExtraConfigColumns];
  /**
   *  @internal
   * Used to store the table name before the transformation via the `tableCreator` functions.
   */
  [BaseName];
  /** @internal */
  [IsAlias] = false;
  /** @internal */
  [IsDrizzleTable] = true;
  /** @internal */
  [ExtraConfigBuilder] = void 0;
  constructor(name, schema, baseName) {
    this[TableName] = this[OriginalName] = name;
    this[Schema] = schema;
    this[BaseName] = baseName;
  }
};
function getTableName(table) {
  return table[TableName];
}
function getTableUniqueName(table) {
  return `${table[Schema] ?? "public"}.${table[TableName]}`;
}

// node_modules/drizzle-orm/sql/sql.js
var FakePrimitiveParam = class {
  static [entityKind] = "FakePrimitiveParam";
};
function isSQLWrapper(value) {
  return value !== null && value !== void 0 && typeof value.getSQL === "function";
}
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}
var StringChunk = class {
  static [entityKind] = "StringChunk";
  value;
  constructor(value) {
    this.value = Array.isArray(value) ? value : [value];
  }
  getSQL() {
    return new SQL([this]);
  }
};
var SQL = class _SQL {
  constructor(queryChunks) {
    this.queryChunks = queryChunks;
    for (const chunk of queryChunks) {
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        this.usedTables.push(
          schemaName === void 0 ? chunk[Table.Symbol.Name] : schemaName + "." + chunk[Table.Symbol.Name]
        );
      }
    }
  }
  static [entityKind] = "SQL";
  /** @internal */
  decoder = noopDecoder;
  shouldInlineParams = false;
  /** @internal */
  usedTables = [];
  append(query) {
    this.queryChunks.push(...query.queryChunks);
    return this;
  }
  toQuery(config) {
    return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
      const query = this.buildQueryFromSourceParams(this.queryChunks, config);
      span?.setAttributes({
        "drizzle.query.text": query.sql,
        "drizzle.query.params": JSON.stringify(query.params)
      });
      return query;
    });
  }
  buildQueryFromSourceParams(chunks, _config) {
    const config = Object.assign({}, _config, {
      inlineParams: _config.inlineParams || this.shouldInlineParams,
      paramStartIndex: _config.paramStartIndex || { value: 0 }
    });
    const {
      casing,
      escapeName,
      escapeParam,
      prepareTyping,
      inlineParams,
      paramStartIndex
    } = config;
    return mergeQueries(chunks.map((chunk) => {
      if (is(chunk, StringChunk)) {
        return { sql: chunk.value.join(""), params: [] };
      }
      if (is(chunk, Name)) {
        return { sql: escapeName(chunk.value), params: [] };
      }
      if (chunk === void 0) {
        return { sql: "", params: [] };
      }
      if (Array.isArray(chunk)) {
        const result = [new StringChunk("(")];
        for (const [i, p] of chunk.entries()) {
          result.push(p);
          if (i < chunk.length - 1) {
            result.push(new StringChunk(", "));
          }
        }
        result.push(new StringChunk(")"));
        return this.buildQueryFromSourceParams(result, config);
      }
      if (is(chunk, _SQL)) {
        return this.buildQueryFromSourceParams(chunk.queryChunks, {
          ...config,
          inlineParams: inlineParams || chunk.shouldInlineParams
        });
      }
      if (is(chunk, Table)) {
        const schemaName = chunk[Table.Symbol.Schema];
        const tableName = chunk[Table.Symbol.Name];
        return {
          sql: schemaName === void 0 || chunk[IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
          params: []
        };
      }
      if (is(chunk, Column)) {
        const columnName = casing.getColumnCasing(chunk);
        if (_config.invokeSource === "indexes") {
          return { sql: escapeName(columnName), params: [] };
        }
        const schemaName = chunk.table[Table.Symbol.Schema];
        return {
          sql: chunk.table[IsAlias] || schemaName === void 0 ? escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName),
          params: []
        };
      }
      if (is(chunk, View)) {
        const schemaName = chunk[ViewBaseConfig].schema;
        const viewName = chunk[ViewBaseConfig].name;
        return {
          sql: schemaName === void 0 || chunk[ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
          params: []
        };
      }
      if (is(chunk, Param)) {
        if (is(chunk.value, Placeholder)) {
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }
        const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
        if (is(mappedValue, _SQL)) {
          return this.buildQueryFromSourceParams([mappedValue], config);
        }
        if (inlineParams) {
          return { sql: this.mapInlineParam(mappedValue, config), params: [] };
        }
        let typings = ["none"];
        if (prepareTyping) {
          typings = [prepareTyping(chunk.encoder)];
        }
        return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
      }
      if (is(chunk, Placeholder)) {
        return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
      }
      if (is(chunk, _SQL.Aliased) && chunk.fieldAlias !== void 0) {
        return { sql: escapeName(chunk.fieldAlias), params: [] };
      }
      if (is(chunk, Subquery)) {
        if (chunk._.isWith) {
          return { sql: escapeName(chunk._.alias), params: [] };
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk._.sql,
          new StringChunk(") "),
          new Name(chunk._.alias)
        ], config);
      }
      if (isPgEnum(chunk)) {
        if (chunk.schema) {
          return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
        }
        return { sql: escapeName(chunk.enumName), params: [] };
      }
      if (isSQLWrapper(chunk)) {
        if (chunk.shouldOmitSQLParens?.()) {
          return this.buildQueryFromSourceParams([chunk.getSQL()], config);
        }
        return this.buildQueryFromSourceParams([
          new StringChunk("("),
          chunk.getSQL(),
          new StringChunk(")")
        ], config);
      }
      if (inlineParams) {
        return { sql: this.mapInlineParam(chunk, config), params: [] };
      }
      return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
    }));
  }
  mapInlineParam(chunk, { escapeString }) {
    if (chunk === null) {
      return "null";
    }
    if (typeof chunk === "number" || typeof chunk === "boolean") {
      return chunk.toString();
    }
    if (typeof chunk === "string") {
      return escapeString(chunk);
    }
    if (typeof chunk === "object") {
      const mappedValueAsString = chunk.toString();
      if (mappedValueAsString === "[object Object]") {
        return escapeString(JSON.stringify(chunk));
      }
      return escapeString(mappedValueAsString);
    }
    throw new Error("Unexpected param value: " + chunk);
  }
  getSQL() {
    return this;
  }
  as(alias) {
    if (alias === void 0) {
      return this;
    }
    return new _SQL.Aliased(this, alias);
  }
  mapWith(decoder) {
    this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
    return this;
  }
  inlineParams() {
    this.shouldInlineParams = true;
    return this;
  }
  /**
   * This method is used to conditionally include a part of the query.
   *
   * @param condition - Condition to check
   * @returns itself if the condition is `true`, otherwise `undefined`
   */
  if(condition) {
    return condition ? this : void 0;
  }
};
var Name = class {
  constructor(value) {
    this.value = value;
  }
  static [entityKind] = "Name";
  brand;
  getSQL() {
    return new SQL([this]);
  }
};
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
var noopDecoder = {
  mapFromDriverValue: (value) => value
};
var noopEncoder = {
  mapToDriverValue: (value) => value
};
var noopMapper = {
  ...noopDecoder,
  ...noopEncoder
};
var Param = class {
  /**
   * @param value - Parameter value
   * @param encoder - Encoder to convert the value to a driver parameter
   */
  constructor(value, encoder = noopEncoder) {
    this.value = value;
    this.encoder = encoder;
  }
  static [entityKind] = "Param";
  brand;
  getSQL() {
    return new SQL([this]);
  }
};
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
((sql2) => {
  function empty() {
    return new SQL([]);
  }
  sql2.empty = empty;
  function fromList(list) {
    return new SQL(list);
  }
  sql2.fromList = fromList;
  function raw(str) {
    return new SQL([new StringChunk(str)]);
  }
  sql2.raw = raw;
  function join(chunks, separator) {
    const result = [];
    for (const [i, chunk] of chunks.entries()) {
      if (i > 0 && separator !== void 0) {
        result.push(separator);
      }
      result.push(chunk);
    }
    return new SQL(result);
  }
  sql2.join = join;
  function identifier(value) {
    return new Name(value);
  }
  sql2.identifier = identifier;
  function placeholder2(name2) {
    return new Placeholder(name2);
  }
  sql2.placeholder = placeholder2;
  function param2(value, encoder) {
    return new Param(value, encoder);
  }
  sql2.param = param2;
})(sql || (sql = {}));
((SQL2) => {
  class Aliased {
    constructor(sql2, fieldAlias) {
      this.sql = sql2;
      this.fieldAlias = fieldAlias;
    }
    static [entityKind] = "SQL.Aliased";
    /** @internal */
    isSelectionField = false;
    getSQL() {
      return this.sql;
    }
    /** @internal */
    clone() {
      return new Aliased(this.sql, this.fieldAlias);
    }
  }
  SQL2.Aliased = Aliased;
})(SQL || (SQL = {}));
var Placeholder = class {
  constructor(name2) {
    this.name = name2;
  }
  static [entityKind] = "Placeholder";
  getSQL() {
    return new SQL([this]);
  }
};
function fillPlaceholders(params, values) {
  return params.map((p) => {
    if (is(p, Placeholder)) {
      if (!(p.name in values)) {
        throw new Error(`No value for placeholder "${p.name}" was provided`);
      }
      return values[p.name];
    }
    if (is(p, Param) && is(p.value, Placeholder)) {
      if (!(p.value.name in values)) {
        throw new Error(`No value for placeholder "${p.value.name}" was provided`);
      }
      return p.encoder.mapToDriverValue(values[p.value.name]);
    }
    return p;
  });
}
var IsDrizzleView = /* @__PURE__ */ Symbol.for("drizzle:IsDrizzleView");
var View = class {
  static [entityKind] = "View";
  /** @internal */
  [ViewBaseConfig];
  /** @internal */
  [IsDrizzleView] = true;
  constructor({ name: name2, schema, selectedFields, query }) {
    this[ViewBaseConfig] = {
      name: name2,
      originalName: name2,
      schema,
      selectedFields,
      query,
      isExisting: !query,
      isAlias: false
    };
  }
  getSQL() {
    return new SQL([this]);
  }
};
Column.prototype.getSQL = function() {
  return new SQL([this]);
};
Table.prototype.getSQL = function() {
  return new SQL([this]);
};
Subquery.prototype.getSQL = function() {
  return new SQL([this]);
};

// node_modules/drizzle-orm/alias.js
var ColumnAliasProxyHandler = class {
  constructor(table) {
    this.table = table;
  }
  static [entityKind] = "ColumnAliasProxyHandler";
  get(columnObj, prop) {
    if (prop === "table") {
      return this.table;
    }
    return columnObj[prop];
  }
};
var TableAliasProxyHandler = class {
  constructor(alias, replaceOriginalName) {
    this.alias = alias;
    this.replaceOriginalName = replaceOriginalName;
  }
  static [entityKind] = "TableAliasProxyHandler";
  get(target, prop) {
    if (prop === Table.Symbol.IsAlias) {
      return true;
    }
    if (prop === Table.Symbol.Name) {
      return this.alias;
    }
    if (this.replaceOriginalName && prop === Table.Symbol.OriginalName) {
      return this.alias;
    }
    if (prop === ViewBaseConfig) {
      return {
        ...target[ViewBaseConfig],
        name: this.alias,
        isAlias: true
      };
    }
    if (prop === Table.Symbol.Columns) {
      const columns = target[Table.Symbol.Columns];
      if (!columns) {
        return columns;
      }
      const proxiedColumns = {};
      Object.keys(columns).map((key) => {
        proxiedColumns[key] = new Proxy(
          columns[key],
          new ColumnAliasProxyHandler(new Proxy(target, this))
        );
      });
      return proxiedColumns;
    }
    const value = target[prop];
    if (is(value, Column)) {
      return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
    }
    return value;
  }
};
var RelationTableAliasProxyHandler = class {
  constructor(alias) {
    this.alias = alias;
  }
  static [entityKind] = "RelationTableAliasProxyHandler";
  get(target, prop) {
    if (prop === "sourceTable") {
      return aliasedTable(target.sourceTable, this.alias);
    }
    return target[prop];
  }
};
function aliasedTable(table, tableAlias) {
  return new Proxy(table, new TableAliasProxyHandler(tableAlias, false));
}
function aliasedTableColumn(column, tableAlias) {
  return new Proxy(
    column,
    new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false)))
  );
}
function mapColumnsInAliasedSQLToAlias(query, alias) {
  return new SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
}
function mapColumnsInSQLToAlias(query, alias) {
  return sql.join(query.queryChunks.map((c) => {
    if (is(c, Column)) {
      return aliasedTableColumn(c, alias);
    }
    if (is(c, SQL)) {
      return mapColumnsInSQLToAlias(c, alias);
    }
    if (is(c, SQL.Aliased)) {
      return mapColumnsInAliasedSQLToAlias(c, alias);
    }
    return c;
  }));
}

// node_modules/drizzle-orm/errors.js
var DrizzleError = class extends Error {
  static [entityKind] = "DrizzleError";
  constructor({ message, cause }) {
    super(message);
    this.name = "DrizzleError";
    this.cause = cause;
  }
};
var DrizzleQueryError = class _DrizzleQueryError extends Error {
  constructor(query, params, cause) {
    super(`Failed query: ${query}
params: ${params}`);
    this.query = query;
    this.params = params;
    this.cause = cause;
    Error.captureStackTrace(this, _DrizzleQueryError);
    if (cause) this.cause = cause;
  }
};
var TransactionRollbackError = class extends DrizzleError {
  static [entityKind] = "TransactionRollbackError";
  constructor() {
    super({ message: "Rollback" });
  }
};

// node_modules/drizzle-orm/logger.js
var ConsoleLogWriter = class {
  static [entityKind] = "ConsoleLogWriter";
  write(message) {
    console.log(message);
  }
};
var DefaultLogger = class {
  static [entityKind] = "DefaultLogger";
  writer;
  constructor(config) {
    this.writer = config?.writer ?? new ConsoleLogWriter();
  }
  logQuery(query, params) {
    const stringifiedParams = params.map((p) => {
      try {
        return JSON.stringify(p);
      } catch {
        return String(p);
      }
    });
    const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
    this.writer.write(`Query: ${query}${paramsStr}`);
  }
};
var NoopLogger = class {
  static [entityKind] = "NoopLogger";
  logQuery() {
  }
};

// node_modules/drizzle-orm/query-promise.js
var QueryPromise = class {
  static [entityKind] = "QueryPromise";
  [Symbol.toStringTag] = "QueryPromise";
  catch(onRejected) {
    return this.then(void 0, onRejected);
  }
  finally(onFinally) {
    return this.then(
      (value) => {
        onFinally?.();
        return value;
      },
      (reason) => {
        onFinally?.();
        throw reason;
      }
    );
  }
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
};

// node_modules/drizzle-orm/utils.js
function mapResultRow(columns, row, joinsNotNullableMap) {
  const nullifyMap = {};
  const result = columns.reduce(
    (result2, { path, field }, columnIndex) => {
      let decoder;
      if (is(field, Column)) {
        decoder = field;
      } else if (is(field, SQL)) {
        decoder = field.decoder;
      } else if (is(field, Subquery)) {
        decoder = field._.sql.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      let node = result2;
      for (const [pathChunkIndex, pathChunk] of path.entries()) {
        if (pathChunkIndex < path.length - 1) {
          if (!(pathChunk in node)) {
            node[pathChunk] = {};
          }
          node = node[pathChunk];
        } else {
          const rawValue = row[columnIndex];
          const value = node[pathChunk] = rawValue === null ? null : decoder.mapFromDriverValue(rawValue);
          if (joinsNotNullableMap && is(field, Column) && path.length === 2) {
            const objectName = path[0];
            if (!(objectName in nullifyMap)) {
              nullifyMap[objectName] = value === null ? getTableName(field.table) : false;
            } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== getTableName(field.table)) {
              nullifyMap[objectName] = false;
            }
          }
        }
      }
      return result2;
    },
    {}
  );
  if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
    for (const [objectName, tableName] of Object.entries(nullifyMap)) {
      if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
        result[objectName] = null;
      }
    }
  }
  return result;
}
function orderSelectedFields(fields, pathPrefix) {
  return Object.entries(fields).reduce((result, [name, field]) => {
    if (typeof name !== "string") {
      return result;
    }
    const newPath = pathPrefix ? [...pathPrefix, name] : [name];
    if (is(field, Column) || is(field, SQL) || is(field, SQL.Aliased) || is(field, Subquery)) {
      result.push({ path: newPath, field });
    } else if (is(field, Table)) {
      result.push(...orderSelectedFields(field[Table.Symbol.Columns], newPath));
    } else {
      result.push(...orderSelectedFields(field, newPath));
    }
    return result;
  }, []);
}
function haveSameKeys(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const [index2, key] of leftKeys.entries()) {
    if (key !== rightKeys[index2]) {
      return false;
    }
  }
  return true;
}
function mapUpdateSet(table, values) {
  const entries = Object.entries(values).filter(([, value]) => value !== void 0).map(([key, value]) => {
    if (is(value, SQL) || is(value, Column)) {
      return [key, value];
    } else {
      return [key, new Param(value, table[Table.Symbol.Columns][key])];
    }
  });
  if (entries.length === 0) {
    throw new Error("No values to set");
  }
  return Object.fromEntries(entries);
}
function applyMixins(baseClass, extendedClasses) {
  for (const extendedClass of extendedClasses) {
    for (const name of Object.getOwnPropertyNames(extendedClass.prototype)) {
      if (name === "constructor") continue;
      Object.defineProperty(
        baseClass.prototype,
        name,
        Object.getOwnPropertyDescriptor(extendedClass.prototype, name) || /* @__PURE__ */ Object.create(null)
      );
    }
  }
}
function getTableColumns(table) {
  return table[Table.Symbol.Columns];
}
function getTableLikeName(table) {
  return is(table, Subquery) ? table._.alias : is(table, View) ? table[ViewBaseConfig].name : is(table, SQL) ? void 0 : table[Table.Symbol.IsAlias] ? table[Table.Symbol.Name] : table[Table.Symbol.BaseName];
}
function getColumnNameAndConfig(a, b) {
  return {
    name: typeof a === "string" && a.length > 0 ? a : "",
    config: typeof a === "object" ? a : b
  };
}
function isConfig(data) {
  if (typeof data !== "object" || data === null) return false;
  if (data.constructor.name !== "Object") return false;
  if ("logger" in data) {
    const type = typeof data["logger"];
    if (type !== "boolean" && (type !== "object" || typeof data["logger"]["logQuery"] !== "function") && type !== "undefined") return false;
    return true;
  }
  if ("schema" in data) {
    const type = typeof data["schema"];
    if (type !== "object" && type !== "undefined") return false;
    return true;
  }
  if ("casing" in data) {
    const type = typeof data["casing"];
    if (type !== "string" && type !== "undefined") return false;
    return true;
  }
  if ("mode" in data) {
    if (data["mode"] !== "default" || data["mode"] !== "planetscale" || data["mode"] !== void 0) return false;
    return true;
  }
  if ("connection" in data) {
    const type = typeof data["connection"];
    if (type !== "string" && type !== "object" && type !== "undefined") return false;
    return true;
  }
  if ("client" in data) {
    const type = typeof data["client"];
    if (type !== "object" && type !== "function" && type !== "undefined") return false;
    return true;
  }
  if (Object.keys(data).length === 0) return true;
  return false;
}
var textDecoder = typeof TextDecoder === "undefined" ? null : new TextDecoder();

// node_modules/drizzle-orm/pg-core/columns/int.common.js
var PgIntColumnBaseBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgIntColumnBaseBuilder";
  generatedAlwaysAsIdentity(sequence) {
    if (sequence) {
      const { name, ...options } = sequence;
      this.config.generatedIdentity = {
        type: "always",
        sequenceName: name,
        sequenceOptions: options
      };
    } else {
      this.config.generatedIdentity = {
        type: "always"
      };
    }
    this.config.hasDefault = true;
    this.config.notNull = true;
    return this;
  }
  generatedByDefaultAsIdentity(sequence) {
    if (sequence) {
      const { name, ...options } = sequence;
      this.config.generatedIdentity = {
        type: "byDefault",
        sequenceName: name,
        sequenceOptions: options
      };
    } else {
      this.config.generatedIdentity = {
        type: "byDefault"
      };
    }
    this.config.hasDefault = true;
    this.config.notNull = true;
    return this;
  }
};

// node_modules/drizzle-orm/pg-core/columns/bigint.js
var PgBigInt53Builder = class extends PgIntColumnBaseBuilder {
  static [entityKind] = "PgBigInt53Builder";
  constructor(name) {
    super(name, "number", "PgBigInt53");
  }
  /** @internal */
  build(table) {
    return new PgBigInt53(table, this.config);
  }
};
var PgBigInt53 = class extends PgColumn {
  static [entityKind] = "PgBigInt53";
  getSQLType() {
    return "bigint";
  }
  mapFromDriverValue(value) {
    if (typeof value === "number") {
      return value;
    }
    return Number(value);
  }
};
var PgBigInt64Builder = class extends PgIntColumnBaseBuilder {
  static [entityKind] = "PgBigInt64Builder";
  constructor(name) {
    super(name, "bigint", "PgBigInt64");
  }
  /** @internal */
  build(table) {
    return new PgBigInt64(
      table,
      this.config
    );
  }
};
var PgBigInt64 = class extends PgColumn {
  static [entityKind] = "PgBigInt64";
  getSQLType() {
    return "bigint";
  }
  // eslint-disable-next-line unicorn/prefer-native-coercion-functions
  mapFromDriverValue(value) {
    return BigInt(value);
  }
};
function bigint(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config.mode === "number") {
    return new PgBigInt53Builder(name);
  }
  return new PgBigInt64Builder(name);
}

// node_modules/drizzle-orm/pg-core/columns/bigserial.js
var PgBigSerial53Builder = class extends PgColumnBuilder {
  static [entityKind] = "PgBigSerial53Builder";
  constructor(name) {
    super(name, "number", "PgBigSerial53");
    this.config.hasDefault = true;
    this.config.notNull = true;
  }
  /** @internal */
  build(table) {
    return new PgBigSerial53(
      table,
      this.config
    );
  }
};
var PgBigSerial53 = class extends PgColumn {
  static [entityKind] = "PgBigSerial53";
  getSQLType() {
    return "bigserial";
  }
  mapFromDriverValue(value) {
    if (typeof value === "number") {
      return value;
    }
    return Number(value);
  }
};
var PgBigSerial64Builder = class extends PgColumnBuilder {
  static [entityKind] = "PgBigSerial64Builder";
  constructor(name) {
    super(name, "bigint", "PgBigSerial64");
    this.config.hasDefault = true;
  }
  /** @internal */
  build(table) {
    return new PgBigSerial64(
      table,
      this.config
    );
  }
};
var PgBigSerial64 = class extends PgColumn {
  static [entityKind] = "PgBigSerial64";
  getSQLType() {
    return "bigserial";
  }
  // eslint-disable-next-line unicorn/prefer-native-coercion-functions
  mapFromDriverValue(value) {
    return BigInt(value);
  }
};
function bigserial(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config.mode === "number") {
    return new PgBigSerial53Builder(name);
  }
  return new PgBigSerial64Builder(name);
}

// node_modules/drizzle-orm/pg-core/columns/boolean.js
var PgBooleanBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgBooleanBuilder";
  constructor(name) {
    super(name, "boolean", "PgBoolean");
  }
  /** @internal */
  build(table) {
    return new PgBoolean(table, this.config);
  }
};
var PgBoolean = class extends PgColumn {
  static [entityKind] = "PgBoolean";
  getSQLType() {
    return "boolean";
  }
};
function boolean(name) {
  return new PgBooleanBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/char.js
var PgCharBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgCharBuilder";
  constructor(name, config) {
    super(name, "string", "PgChar");
    this.config.length = config.length;
    this.config.enumValues = config.enum;
  }
  /** @internal */
  build(table) {
    return new PgChar(
      table,
      this.config
    );
  }
};
var PgChar = class extends PgColumn {
  static [entityKind] = "PgChar";
  length = this.config.length;
  enumValues = this.config.enumValues;
  getSQLType() {
    return this.length === void 0 ? `char` : `char(${this.length})`;
  }
};
function char(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgCharBuilder(name, config);
}

// node_modules/drizzle-orm/pg-core/columns/cidr.js
var PgCidrBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgCidrBuilder";
  constructor(name) {
    super(name, "string", "PgCidr");
  }
  /** @internal */
  build(table) {
    return new PgCidr(table, this.config);
  }
};
var PgCidr = class extends PgColumn {
  static [entityKind] = "PgCidr";
  getSQLType() {
    return "cidr";
  }
};
function cidr(name) {
  return new PgCidrBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/custom.js
var PgCustomColumnBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgCustomColumnBuilder";
  constructor(name, fieldConfig, customTypeParams) {
    super(name, "custom", "PgCustomColumn");
    this.config.fieldConfig = fieldConfig;
    this.config.customTypeParams = customTypeParams;
  }
  /** @internal */
  build(table) {
    return new PgCustomColumn(
      table,
      this.config
    );
  }
};
var PgCustomColumn = class extends PgColumn {
  static [entityKind] = "PgCustomColumn";
  sqlName;
  mapTo;
  mapFrom;
  constructor(table, config) {
    super(table, config);
    this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
    this.mapTo = config.customTypeParams.toDriver;
    this.mapFrom = config.customTypeParams.fromDriver;
  }
  getSQLType() {
    return this.sqlName;
  }
  mapFromDriverValue(value) {
    return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
  }
  mapToDriverValue(value) {
    return typeof this.mapTo === "function" ? this.mapTo(value) : value;
  }
};
function customType(customTypeParams) {
  return (a, b) => {
    const { name, config } = getColumnNameAndConfig(a, b);
    return new PgCustomColumnBuilder(name, config, customTypeParams);
  };
}

// node_modules/drizzle-orm/pg-core/columns/date.common.js
var PgDateColumnBaseBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgDateColumnBaseBuilder";
  defaultNow() {
    return this.default(sql`now()`);
  }
};

// node_modules/drizzle-orm/pg-core/columns/date.js
var PgDateBuilder = class extends PgDateColumnBaseBuilder {
  static [entityKind] = "PgDateBuilder";
  constructor(name) {
    super(name, "date", "PgDate");
  }
  /** @internal */
  build(table) {
    return new PgDate(table, this.config);
  }
};
var PgDate = class extends PgColumn {
  static [entityKind] = "PgDate";
  getSQLType() {
    return "date";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return new Date(value);
    return value;
  }
  mapToDriverValue(value) {
    return value.toISOString();
  }
};
var PgDateStringBuilder = class extends PgDateColumnBaseBuilder {
  static [entityKind] = "PgDateStringBuilder";
  constructor(name) {
    super(name, "string", "PgDateString");
  }
  /** @internal */
  build(table) {
    return new PgDateString(
      table,
      this.config
    );
  }
};
var PgDateString = class extends PgColumn {
  static [entityKind] = "PgDateString";
  getSQLType() {
    return "date";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return value;
    return value.toISOString().slice(0, -14);
  }
};
function date(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config?.mode === "date") {
    return new PgDateBuilder(name);
  }
  return new PgDateStringBuilder(name);
}

// node_modules/drizzle-orm/pg-core/columns/double-precision.js
var PgDoublePrecisionBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgDoublePrecisionBuilder";
  constructor(name) {
    super(name, "number", "PgDoublePrecision");
  }
  /** @internal */
  build(table) {
    return new PgDoublePrecision(
      table,
      this.config
    );
  }
};
var PgDoublePrecision = class extends PgColumn {
  static [entityKind] = "PgDoublePrecision";
  getSQLType() {
    return "double precision";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      return Number.parseFloat(value);
    }
    return value;
  }
};
function doublePrecision(name) {
  return new PgDoublePrecisionBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/inet.js
var PgInetBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgInetBuilder";
  constructor(name) {
    super(name, "string", "PgInet");
  }
  /** @internal */
  build(table) {
    return new PgInet(table, this.config);
  }
};
var PgInet = class extends PgColumn {
  static [entityKind] = "PgInet";
  getSQLType() {
    return "inet";
  }
};
function inet(name) {
  return new PgInetBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/integer.js
var PgIntegerBuilder = class extends PgIntColumnBaseBuilder {
  static [entityKind] = "PgIntegerBuilder";
  constructor(name) {
    super(name, "number", "PgInteger");
  }
  /** @internal */
  build(table) {
    return new PgInteger(table, this.config);
  }
};
var PgInteger = class extends PgColumn {
  static [entityKind] = "PgInteger";
  getSQLType() {
    return "integer";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      return Number.parseInt(value);
    }
    return value;
  }
};
function integer(name) {
  return new PgIntegerBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/interval.js
var PgIntervalBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgIntervalBuilder";
  constructor(name, intervalConfig) {
    super(name, "string", "PgInterval");
    this.config.intervalConfig = intervalConfig;
  }
  /** @internal */
  build(table) {
    return new PgInterval(table, this.config);
  }
};
var PgInterval = class extends PgColumn {
  static [entityKind] = "PgInterval";
  fields = this.config.intervalConfig.fields;
  precision = this.config.intervalConfig.precision;
  getSQLType() {
    const fields = this.fields ? ` ${this.fields}` : "";
    const precision = this.precision ? `(${this.precision})` : "";
    return `interval${fields}${precision}`;
  }
};
function interval(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgIntervalBuilder(name, config);
}

// node_modules/drizzle-orm/pg-core/columns/json.js
var PgJsonBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgJsonBuilder";
  constructor(name) {
    super(name, "json", "PgJson");
  }
  /** @internal */
  build(table) {
    return new PgJson(table, this.config);
  }
};
var PgJson = class extends PgColumn {
  static [entityKind] = "PgJson";
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return "json";
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
};
function json(name) {
  return new PgJsonBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/jsonb.js
var PgJsonbBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgJsonbBuilder";
  constructor(name) {
    super(name, "json", "PgJsonb");
  }
  /** @internal */
  build(table) {
    return new PgJsonb(table, this.config);
  }
};
var PgJsonb = class extends PgColumn {
  static [entityKind] = "PgJsonb";
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return "jsonb";
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
};
function jsonb(name) {
  return new PgJsonbBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/line.js
var PgLineBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgLineBuilder";
  constructor(name) {
    super(name, "array", "PgLine");
  }
  /** @internal */
  build(table) {
    return new PgLineTuple(
      table,
      this.config
    );
  }
};
var PgLineTuple = class extends PgColumn {
  static [entityKind] = "PgLine";
  getSQLType() {
    return "line";
  }
  mapFromDriverValue(value) {
    const [a, b, c] = value.slice(1, -1).split(",");
    return [Number.parseFloat(a), Number.parseFloat(b), Number.parseFloat(c)];
  }
  mapToDriverValue(value) {
    return `{${value[0]},${value[1]},${value[2]}}`;
  }
};
var PgLineABCBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgLineABCBuilder";
  constructor(name) {
    super(name, "json", "PgLineABC");
  }
  /** @internal */
  build(table) {
    return new PgLineABC(
      table,
      this.config
    );
  }
};
var PgLineABC = class extends PgColumn {
  static [entityKind] = "PgLineABC";
  getSQLType() {
    return "line";
  }
  mapFromDriverValue(value) {
    const [a, b, c] = value.slice(1, -1).split(",");
    return { a: Number.parseFloat(a), b: Number.parseFloat(b), c: Number.parseFloat(c) };
  }
  mapToDriverValue(value) {
    return `{${value.a},${value.b},${value.c}}`;
  }
};
function line(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (!config?.mode || config.mode === "tuple") {
    return new PgLineBuilder(name);
  }
  return new PgLineABCBuilder(name);
}

// node_modules/drizzle-orm/pg-core/columns/macaddr.js
var PgMacaddrBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgMacaddrBuilder";
  constructor(name) {
    super(name, "string", "PgMacaddr");
  }
  /** @internal */
  build(table) {
    return new PgMacaddr(table, this.config);
  }
};
var PgMacaddr = class extends PgColumn {
  static [entityKind] = "PgMacaddr";
  getSQLType() {
    return "macaddr";
  }
};
function macaddr(name) {
  return new PgMacaddrBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/macaddr8.js
var PgMacaddr8Builder = class extends PgColumnBuilder {
  static [entityKind] = "PgMacaddr8Builder";
  constructor(name) {
    super(name, "string", "PgMacaddr8");
  }
  /** @internal */
  build(table) {
    return new PgMacaddr8(table, this.config);
  }
};
var PgMacaddr8 = class extends PgColumn {
  static [entityKind] = "PgMacaddr8";
  getSQLType() {
    return "macaddr8";
  }
};
function macaddr8(name) {
  return new PgMacaddr8Builder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/numeric.js
var PgNumericBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgNumericBuilder";
  constructor(name, precision, scale) {
    super(name, "string", "PgNumeric");
    this.config.precision = precision;
    this.config.scale = scale;
  }
  /** @internal */
  build(table) {
    return new PgNumeric(table, this.config);
  }
};
var PgNumeric = class extends PgColumn {
  static [entityKind] = "PgNumeric";
  precision;
  scale;
  constructor(table, config) {
    super(table, config);
    this.precision = config.precision;
    this.scale = config.scale;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return value;
    return String(value);
  }
  getSQLType() {
    if (this.precision !== void 0 && this.scale !== void 0) {
      return `numeric(${this.precision}, ${this.scale})`;
    } else if (this.precision === void 0) {
      return "numeric";
    } else {
      return `numeric(${this.precision})`;
    }
  }
};
var PgNumericNumberBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgNumericNumberBuilder";
  constructor(name, precision, scale) {
    super(name, "number", "PgNumericNumber");
    this.config.precision = precision;
    this.config.scale = scale;
  }
  /** @internal */
  build(table) {
    return new PgNumericNumber(
      table,
      this.config
    );
  }
};
var PgNumericNumber = class extends PgColumn {
  static [entityKind] = "PgNumericNumber";
  precision;
  scale;
  constructor(table, config) {
    super(table, config);
    this.precision = config.precision;
    this.scale = config.scale;
  }
  mapFromDriverValue(value) {
    if (typeof value === "number") return value;
    return Number(value);
  }
  mapToDriverValue = String;
  getSQLType() {
    if (this.precision !== void 0 && this.scale !== void 0) {
      return `numeric(${this.precision}, ${this.scale})`;
    } else if (this.precision === void 0) {
      return "numeric";
    } else {
      return `numeric(${this.precision})`;
    }
  }
};
var PgNumericBigIntBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgNumericBigIntBuilder";
  constructor(name, precision, scale) {
    super(name, "bigint", "PgNumericBigInt");
    this.config.precision = precision;
    this.config.scale = scale;
  }
  /** @internal */
  build(table) {
    return new PgNumericBigInt(
      table,
      this.config
    );
  }
};
var PgNumericBigInt = class extends PgColumn {
  static [entityKind] = "PgNumericBigInt";
  precision;
  scale;
  constructor(table, config) {
    super(table, config);
    this.precision = config.precision;
    this.scale = config.scale;
  }
  mapFromDriverValue = BigInt;
  mapToDriverValue = String;
  getSQLType() {
    if (this.precision !== void 0 && this.scale !== void 0) {
      return `numeric(${this.precision}, ${this.scale})`;
    } else if (this.precision === void 0) {
      return "numeric";
    } else {
      return `numeric(${this.precision})`;
    }
  }
};
function numeric(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  const mode = config?.mode;
  return mode === "number" ? new PgNumericNumberBuilder(name, config?.precision, config?.scale) : mode === "bigint" ? new PgNumericBigIntBuilder(name, config?.precision, config?.scale) : new PgNumericBuilder(name, config?.precision, config?.scale);
}

// node_modules/drizzle-orm/pg-core/columns/point.js
var PgPointTupleBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgPointTupleBuilder";
  constructor(name) {
    super(name, "array", "PgPointTuple");
  }
  /** @internal */
  build(table) {
    return new PgPointTuple(
      table,
      this.config
    );
  }
};
var PgPointTuple = class extends PgColumn {
  static [entityKind] = "PgPointTuple";
  getSQLType() {
    return "point";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      const [x, y] = value.slice(1, -1).split(",");
      return [Number.parseFloat(x), Number.parseFloat(y)];
    }
    return [value.x, value.y];
  }
  mapToDriverValue(value) {
    return `(${value[0]},${value[1]})`;
  }
};
var PgPointObjectBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgPointObjectBuilder";
  constructor(name) {
    super(name, "json", "PgPointObject");
  }
  /** @internal */
  build(table) {
    return new PgPointObject(
      table,
      this.config
    );
  }
};
var PgPointObject = class extends PgColumn {
  static [entityKind] = "PgPointObject";
  getSQLType() {
    return "point";
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") {
      const [x, y] = value.slice(1, -1).split(",");
      return { x: Number.parseFloat(x), y: Number.parseFloat(y) };
    }
    return value;
  }
  mapToDriverValue(value) {
    return `(${value.x},${value.y})`;
  }
};
function point(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (!config?.mode || config.mode === "tuple") {
    return new PgPointTupleBuilder(name);
  }
  return new PgPointObjectBuilder(name);
}

// node_modules/drizzle-orm/pg-core/columns/postgis_extension/utils.js
function hexToBytes(hex) {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(Number.parseInt(hex.slice(c, c + 2), 16));
  }
  return new Uint8Array(bytes);
}
function bytesToFloat64(bytes, offset) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, bytes[offset + i]);
  }
  return view.getFloat64(0, true);
}
function parseEWKB(hex) {
  const bytes = hexToBytes(hex);
  let offset = 0;
  const byteOrder = bytes[offset];
  offset += 1;
  const view = new DataView(bytes.buffer);
  const geomType = view.getUint32(offset, byteOrder === 1);
  offset += 4;
  let _srid;
  if (geomType & 536870912) {
    _srid = view.getUint32(offset, byteOrder === 1);
    offset += 4;
  }
  if ((geomType & 65535) === 1) {
    const x = bytesToFloat64(bytes, offset);
    offset += 8;
    const y = bytesToFloat64(bytes, offset);
    offset += 8;
    return [x, y];
  }
  throw new Error("Unsupported geometry type");
}

// node_modules/drizzle-orm/pg-core/columns/postgis_extension/geometry.js
var PgGeometryBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgGeometryBuilder";
  constructor(name) {
    super(name, "array", "PgGeometry");
  }
  /** @internal */
  build(table) {
    return new PgGeometry(
      table,
      this.config
    );
  }
};
var PgGeometry = class extends PgColumn {
  static [entityKind] = "PgGeometry";
  getSQLType() {
    return "geometry(point)";
  }
  mapFromDriverValue(value) {
    return parseEWKB(value);
  }
  mapToDriverValue(value) {
    return `point(${value[0]} ${value[1]})`;
  }
};
var PgGeometryObjectBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgGeometryObjectBuilder";
  constructor(name) {
    super(name, "json", "PgGeometryObject");
  }
  /** @internal */
  build(table) {
    return new PgGeometryObject(
      table,
      this.config
    );
  }
};
var PgGeometryObject = class extends PgColumn {
  static [entityKind] = "PgGeometryObject";
  getSQLType() {
    return "geometry(point)";
  }
  mapFromDriverValue(value) {
    const parsed = parseEWKB(value);
    return { x: parsed[0], y: parsed[1] };
  }
  mapToDriverValue(value) {
    return `point(${value.x} ${value.y})`;
  }
};
function geometry(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (!config?.mode || config.mode === "tuple") {
    return new PgGeometryBuilder(name);
  }
  return new PgGeometryObjectBuilder(name);
}

// node_modules/drizzle-orm/pg-core/columns/real.js
var PgRealBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgRealBuilder";
  constructor(name, length) {
    super(name, "number", "PgReal");
    this.config.length = length;
  }
  /** @internal */
  build(table) {
    return new PgReal(table, this.config);
  }
};
var PgReal = class extends PgColumn {
  static [entityKind] = "PgReal";
  constructor(table, config) {
    super(table, config);
  }
  getSQLType() {
    return "real";
  }
  mapFromDriverValue = (value) => {
    if (typeof value === "string") {
      return Number.parseFloat(value);
    }
    return value;
  };
};
function real(name) {
  return new PgRealBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/serial.js
var PgSerialBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgSerialBuilder";
  constructor(name) {
    super(name, "number", "PgSerial");
    this.config.hasDefault = true;
    this.config.notNull = true;
  }
  /** @internal */
  build(table) {
    return new PgSerial(table, this.config);
  }
};
var PgSerial = class extends PgColumn {
  static [entityKind] = "PgSerial";
  getSQLType() {
    return "serial";
  }
};
function serial(name) {
  return new PgSerialBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/smallint.js
var PgSmallIntBuilder = class extends PgIntColumnBaseBuilder {
  static [entityKind] = "PgSmallIntBuilder";
  constructor(name) {
    super(name, "number", "PgSmallInt");
  }
  /** @internal */
  build(table) {
    return new PgSmallInt(table, this.config);
  }
};
var PgSmallInt = class extends PgColumn {
  static [entityKind] = "PgSmallInt";
  getSQLType() {
    return "smallint";
  }
  mapFromDriverValue = (value) => {
    if (typeof value === "string") {
      return Number(value);
    }
    return value;
  };
};
function smallint(name) {
  return new PgSmallIntBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/smallserial.js
var PgSmallSerialBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgSmallSerialBuilder";
  constructor(name) {
    super(name, "number", "PgSmallSerial");
    this.config.hasDefault = true;
    this.config.notNull = true;
  }
  /** @internal */
  build(table) {
    return new PgSmallSerial(
      table,
      this.config
    );
  }
};
var PgSmallSerial = class extends PgColumn {
  static [entityKind] = "PgSmallSerial";
  getSQLType() {
    return "smallserial";
  }
};
function smallserial(name) {
  return new PgSmallSerialBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/text.js
var PgTextBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgTextBuilder";
  constructor(name, config) {
    super(name, "string", "PgText");
    this.config.enumValues = config.enum;
  }
  /** @internal */
  build(table) {
    return new PgText(table, this.config);
  }
};
var PgText = class extends PgColumn {
  static [entityKind] = "PgText";
  enumValues = this.config.enumValues;
  getSQLType() {
    return "text";
  }
};
function text(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgTextBuilder(name, config);
}

// node_modules/drizzle-orm/pg-core/columns/time.js
var PgTimeBuilder = class extends PgDateColumnBaseBuilder {
  constructor(name, withTimezone, precision) {
    super(name, "string", "PgTime");
    this.withTimezone = withTimezone;
    this.precision = precision;
    this.config.withTimezone = withTimezone;
    this.config.precision = precision;
  }
  static [entityKind] = "PgTimeBuilder";
  /** @internal */
  build(table) {
    return new PgTime(table, this.config);
  }
};
var PgTime = class extends PgColumn {
  static [entityKind] = "PgTime";
  withTimezone;
  precision;
  constructor(table, config) {
    super(table, config);
    this.withTimezone = config.withTimezone;
    this.precision = config.precision;
  }
  getSQLType() {
    const precision = this.precision === void 0 ? "" : `(${this.precision})`;
    return `time${precision}${this.withTimezone ? " with time zone" : ""}`;
  }
};
function time(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgTimeBuilder(name, config.withTimezone ?? false, config.precision);
}

// node_modules/drizzle-orm/pg-core/columns/timestamp.js
var PgTimestampBuilder = class extends PgDateColumnBaseBuilder {
  static [entityKind] = "PgTimestampBuilder";
  constructor(name, withTimezone, precision) {
    super(name, "date", "PgTimestamp");
    this.config.withTimezone = withTimezone;
    this.config.precision = precision;
  }
  /** @internal */
  build(table) {
    return new PgTimestamp(table, this.config);
  }
};
var PgTimestamp = class extends PgColumn {
  static [entityKind] = "PgTimestamp";
  withTimezone;
  precision;
  constructor(table, config) {
    super(table, config);
    this.withTimezone = config.withTimezone;
    this.precision = config.precision;
  }
  getSQLType() {
    const precision = this.precision === void 0 ? "" : ` (${this.precision})`;
    return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return new Date(this.withTimezone ? value : value + "+0000");
    return value;
  }
  mapToDriverValue = (value) => {
    return value.toISOString();
  };
};
var PgTimestampStringBuilder = class extends PgDateColumnBaseBuilder {
  static [entityKind] = "PgTimestampStringBuilder";
  constructor(name, withTimezone, precision) {
    super(name, "string", "PgTimestampString");
    this.config.withTimezone = withTimezone;
    this.config.precision = precision;
  }
  /** @internal */
  build(table) {
    return new PgTimestampString(
      table,
      this.config
    );
  }
};
var PgTimestampString = class extends PgColumn {
  static [entityKind] = "PgTimestampString";
  withTimezone;
  precision;
  constructor(table, config) {
    super(table, config);
    this.withTimezone = config.withTimezone;
    this.precision = config.precision;
  }
  getSQLType() {
    const precision = this.precision === void 0 ? "" : `(${this.precision})`;
    return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
  }
  mapFromDriverValue(value) {
    if (typeof value === "string") return value;
    const shortened = value.toISOString().slice(0, -1).replace("T", " ");
    if (this.withTimezone) {
      const offset = value.getTimezoneOffset();
      const sign = offset <= 0 ? "+" : "-";
      return `${shortened}${sign}${Math.floor(Math.abs(offset) / 60).toString().padStart(2, "0")}`;
    }
    return shortened;
  }
};
function timestamp(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  if (config?.mode === "string") {
    return new PgTimestampStringBuilder(name, config.withTimezone ?? false, config.precision);
  }
  return new PgTimestampBuilder(name, config?.withTimezone ?? false, config?.precision);
}

// node_modules/drizzle-orm/pg-core/columns/uuid.js
var PgUUIDBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgUUIDBuilder";
  constructor(name) {
    super(name, "string", "PgUUID");
  }
  /**
   * Adds `default gen_random_uuid()` to the column definition.
   */
  defaultRandom() {
    return this.default(sql`gen_random_uuid()`);
  }
  /** @internal */
  build(table) {
    return new PgUUID(table, this.config);
  }
};
var PgUUID = class extends PgColumn {
  static [entityKind] = "PgUUID";
  getSQLType() {
    return "uuid";
  }
};
function uuid(name) {
  return new PgUUIDBuilder(name ?? "");
}

// node_modules/drizzle-orm/pg-core/columns/varchar.js
var PgVarcharBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgVarcharBuilder";
  constructor(name, config) {
    super(name, "string", "PgVarchar");
    this.config.length = config.length;
    this.config.enumValues = config.enum;
  }
  /** @internal */
  build(table) {
    return new PgVarchar(
      table,
      this.config
    );
  }
};
var PgVarchar = class extends PgColumn {
  static [entityKind] = "PgVarchar";
  length = this.config.length;
  enumValues = this.config.enumValues;
  getSQLType() {
    return this.length === void 0 ? `varchar` : `varchar(${this.length})`;
  }
};
function varchar(a, b = {}) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgVarcharBuilder(name, config);
}

// node_modules/drizzle-orm/pg-core/columns/vector_extension/bit.js
var PgBinaryVectorBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgBinaryVectorBuilder";
  constructor(name, config) {
    super(name, "string", "PgBinaryVector");
    this.config.dimensions = config.dimensions;
  }
  /** @internal */
  build(table) {
    return new PgBinaryVector(
      table,
      this.config
    );
  }
};
var PgBinaryVector = class extends PgColumn {
  static [entityKind] = "PgBinaryVector";
  dimensions = this.config.dimensions;
  getSQLType() {
    return `bit(${this.dimensions})`;
  }
};
function bit(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgBinaryVectorBuilder(name, config);
}

// node_modules/drizzle-orm/pg-core/columns/vector_extension/halfvec.js
var PgHalfVectorBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgHalfVectorBuilder";
  constructor(name, config) {
    super(name, "array", "PgHalfVector");
    this.config.dimensions = config.dimensions;
  }
  /** @internal */
  build(table) {
    return new PgHalfVector(
      table,
      this.config
    );
  }
};
var PgHalfVector = class extends PgColumn {
  static [entityKind] = "PgHalfVector";
  dimensions = this.config.dimensions;
  getSQLType() {
    return `halfvec(${this.dimensions})`;
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
  mapFromDriverValue(value) {
    return value.slice(1, -1).split(",").map((v) => Number.parseFloat(v));
  }
};
function halfvec(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgHalfVectorBuilder(name, config);
}

// node_modules/drizzle-orm/pg-core/columns/vector_extension/sparsevec.js
var PgSparseVectorBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgSparseVectorBuilder";
  constructor(name, config) {
    super(name, "string", "PgSparseVector");
    this.config.dimensions = config.dimensions;
  }
  /** @internal */
  build(table) {
    return new PgSparseVector(
      table,
      this.config
    );
  }
};
var PgSparseVector = class extends PgColumn {
  static [entityKind] = "PgSparseVector";
  dimensions = this.config.dimensions;
  getSQLType() {
    return `sparsevec(${this.dimensions})`;
  }
};
function sparsevec(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgSparseVectorBuilder(name, config);
}

// node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.js
var PgVectorBuilder = class extends PgColumnBuilder {
  static [entityKind] = "PgVectorBuilder";
  constructor(name, config) {
    super(name, "array", "PgVector");
    this.config.dimensions = config.dimensions;
  }
  /** @internal */
  build(table) {
    return new PgVector(
      table,
      this.config
    );
  }
};
var PgVector = class extends PgColumn {
  static [entityKind] = "PgVector";
  dimensions = this.config.dimensions;
  getSQLType() {
    return `vector(${this.dimensions})`;
  }
  mapToDriverValue(value) {
    return JSON.stringify(value);
  }
  mapFromDriverValue(value) {
    return value.slice(1, -1).split(",").map((v) => Number.parseFloat(v));
  }
};
function vector(a, b) {
  const { name, config } = getColumnNameAndConfig(a, b);
  return new PgVectorBuilder(name, config);
}

// node_modules/drizzle-orm/pg-core/columns/all.js
function getPgColumnBuilders() {
  return {
    bigint,
    bigserial,
    boolean,
    char,
    cidr,
    customType,
    date,
    doublePrecision,
    inet,
    integer,
    interval,
    json,
    jsonb,
    line,
    macaddr,
    macaddr8,
    numeric,
    point,
    geometry,
    real,
    serial,
    smallint,
    smallserial,
    text,
    time,
    timestamp,
    uuid,
    varchar,
    bit,
    halfvec,
    sparsevec,
    vector
  };
}

// node_modules/drizzle-orm/pg-core/table.js
var InlineForeignKeys = /* @__PURE__ */ Symbol.for("drizzle:PgInlineForeignKeys");
var EnableRLS = /* @__PURE__ */ Symbol.for("drizzle:EnableRLS");
var PgTable = class extends Table {
  static [entityKind] = "PgTable";
  /** @internal */
  static Symbol = Object.assign({}, Table.Symbol, {
    InlineForeignKeys,
    EnableRLS
  });
  /**@internal */
  [InlineForeignKeys] = [];
  /** @internal */
  [EnableRLS] = false;
  /** @internal */
  [Table.Symbol.ExtraConfigBuilder] = void 0;
  /** @internal */
  [Table.Symbol.ExtraConfigColumns] = {};
};
function pgTableWithSchema(name, columns, extraConfig, schema, baseName = name) {
  const rawTable = new PgTable(name, schema, baseName);
  const parsedColumns = typeof columns === "function" ? columns(getPgColumnBuilders()) : columns;
  const builtColumns = Object.fromEntries(
    Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      colBuilder.setName(name2);
      const column = colBuilder.build(rawTable);
      rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
      return [name2, column];
    })
  );
  const builtColumnsForExtraConfig = Object.fromEntries(
    Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      colBuilder.setName(name2);
      const column = colBuilder.buildExtraConfigColumn(rawTable);
      return [name2, column];
    })
  );
  const table = Object.assign(rawTable, builtColumns);
  table[Table.Symbol.Columns] = builtColumns;
  table[Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;
  if (extraConfig) {
    table[PgTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return Object.assign(table, {
    enableRLS: () => {
      table[PgTable.Symbol.EnableRLS] = true;
      return table;
    }
  });
}
var pgTable = (name, columns, extraConfig) => {
  return pgTableWithSchema(name, columns, extraConfig, void 0);
};

// node_modules/drizzle-orm/pg-core/primary-keys.js
var PrimaryKeyBuilder = class {
  static [entityKind] = "PgPrimaryKeyBuilder";
  /** @internal */
  columns;
  /** @internal */
  name;
  constructor(columns, name) {
    this.columns = columns;
    this.name = name;
  }
  /** @internal */
  build(table) {
    return new PrimaryKey(table, this.columns, this.name);
  }
};
var PrimaryKey = class {
  constructor(table, columns, name) {
    this.table = table;
    this.columns = columns;
    this.name = name;
  }
  static [entityKind] = "PgPrimaryKey";
  columns;
  name;
  getName() {
    return this.name ?? `${this.table[PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
  }
};

// node_modules/drizzle-orm/sql/expressions/conditions.js
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is(value, Param) && !is(value, Placeholder) && !is(value, Column) && !is(value, Table) && !is(value, View)) {
    return new Param(value, column);
  }
  return value;
}
var eq = (left, right) => {
  return sql`${left} = ${bindIfParam(right, left)}`;
};
var ne = (left, right) => {
  return sql`${left} <> ${bindIfParam(right, left)}`;
};
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
function not(condition) {
  return sql`not ${condition}`;
}
var gt = (left, right) => {
  return sql`${left} > ${bindIfParam(right, left)}`;
};
var gte = (left, right) => {
  return sql`${left} >= ${bindIfParam(right, left)}`;
};
var lt = (left, right) => {
  return sql`${left} < ${bindIfParam(right, left)}`;
};
var lte = (left, right) => {
  return sql`${left} <= ${bindIfParam(right, left)}`;
};
function inArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} in ${bindIfParam(values, column)}`;
}
function notInArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`true`;
    }
    return sql`${column} not in ${values.map((v) => bindIfParam(v, column))}`;
  }
  return sql`${column} not in ${bindIfParam(values, column)}`;
}
function isNull(value) {
  return sql`${value} is null`;
}
function isNotNull(value) {
  return sql`${value} is not null`;
}
function exists(subquery) {
  return sql`exists ${subquery}`;
}
function notExists(subquery) {
  return sql`not exists ${subquery}`;
}
function between(column, min, max) {
  return sql`${column} between ${bindIfParam(min, column)} and ${bindIfParam(
    max,
    column
  )}`;
}
function notBetween(column, min, max) {
  return sql`${column} not between ${bindIfParam(
    min,
    column
  )} and ${bindIfParam(max, column)}`;
}
function like(column, value) {
  return sql`${column} like ${value}`;
}
function notLike(column, value) {
  return sql`${column} not like ${value}`;
}
function ilike(column, value) {
  return sql`${column} ilike ${value}`;
}
function notIlike(column, value) {
  return sql`${column} not ilike ${value}`;
}

// node_modules/drizzle-orm/sql/expressions/select.js
function asc(column) {
  return sql`${column} asc`;
}
function desc(column) {
  return sql`${column} desc`;
}

// node_modules/drizzle-orm/relations.js
var Relation = class {
  constructor(sourceTable, referencedTable, relationName) {
    this.sourceTable = sourceTable;
    this.referencedTable = referencedTable;
    this.relationName = relationName;
    this.referencedTableName = referencedTable[Table.Symbol.Name];
  }
  static [entityKind] = "Relation";
  referencedTableName;
  fieldName;
};
var Relations = class {
  constructor(table, config) {
    this.table = table;
    this.config = config;
  }
  static [entityKind] = "Relations";
};
var One = class _One extends Relation {
  constructor(sourceTable, referencedTable, config, isNullable) {
    super(sourceTable, referencedTable, config?.relationName);
    this.config = config;
    this.isNullable = isNullable;
  }
  static [entityKind] = "One";
  withFieldName(fieldName) {
    const relation = new _One(
      this.sourceTable,
      this.referencedTable,
      this.config,
      this.isNullable
    );
    relation.fieldName = fieldName;
    return relation;
  }
};
var Many = class _Many extends Relation {
  constructor(sourceTable, referencedTable, config) {
    super(sourceTable, referencedTable, config?.relationName);
    this.config = config;
  }
  static [entityKind] = "Many";
  withFieldName(fieldName) {
    const relation = new _Many(
      this.sourceTable,
      this.referencedTable,
      this.config
    );
    relation.fieldName = fieldName;
    return relation;
  }
};
function getOperators() {
  return {
    and,
    between,
    eq,
    exists,
    gt,
    gte,
    ilike,
    inArray,
    isNull,
    isNotNull,
    like,
    lt,
    lte,
    ne,
    not,
    notBetween,
    notExists,
    notLike,
    notIlike,
    notInArray,
    or,
    sql
  };
}
function getOrderByOperators() {
  return {
    sql,
    asc,
    desc
  };
}
function extractTablesRelationalConfig(schema, configHelpers) {
  if (Object.keys(schema).length === 1 && "default" in schema && !is(schema["default"], Table)) {
    schema = schema["default"];
  }
  const tableNamesMap = {};
  const relationsBuffer = {};
  const tablesConfig = {};
  for (const [key, value] of Object.entries(schema)) {
    if (is(value, Table)) {
      const dbName = getTableUniqueName(value);
      const bufferedRelations = relationsBuffer[dbName];
      tableNamesMap[dbName] = key;
      tablesConfig[key] = {
        tsName: key,
        dbName: value[Table.Symbol.Name],
        schema: value[Table.Symbol.Schema],
        columns: value[Table.Symbol.Columns],
        relations: bufferedRelations?.relations ?? {},
        primaryKey: bufferedRelations?.primaryKey ?? []
      };
      for (const column of Object.values(
        value[Table.Symbol.Columns]
      )) {
        if (column.primary) {
          tablesConfig[key].primaryKey.push(column);
        }
      }
      const extraConfig = value[Table.Symbol.ExtraConfigBuilder]?.(value[Table.Symbol.ExtraConfigColumns]);
      if (extraConfig) {
        for (const configEntry of Object.values(extraConfig)) {
          if (is(configEntry, PrimaryKeyBuilder)) {
            tablesConfig[key].primaryKey.push(...configEntry.columns);
          }
        }
      }
    } else if (is(value, Relations)) {
      const dbName = getTableUniqueName(value.table);
      const tableName = tableNamesMap[dbName];
      const relations2 = value.config(
        configHelpers(value.table)
      );
      let primaryKey;
      for (const [relationName, relation] of Object.entries(relations2)) {
        if (tableName) {
          const tableConfig = tablesConfig[tableName];
          tableConfig.relations[relationName] = relation;
          if (primaryKey) {
            tableConfig.primaryKey.push(...primaryKey);
          }
        } else {
          if (!(dbName in relationsBuffer)) {
            relationsBuffer[dbName] = {
              relations: {},
              primaryKey
            };
          }
          relationsBuffer[dbName].relations[relationName] = relation;
        }
      }
    }
  }
  return { tables: tablesConfig, tableNamesMap };
}
function createOne(sourceTable) {
  return function one(table, config) {
    return new One(
      sourceTable,
      table,
      config,
      config?.fields.reduce((res, f) => res && f.notNull, true) ?? false
    );
  };
}
function createMany(sourceTable) {
  return function many(referencedTable, config) {
    return new Many(sourceTable, referencedTable, config);
  };
}
function normalizeRelation(schema, tableNamesMap, relation) {
  if (is(relation, One) && relation.config) {
    return {
      fields: relation.config.fields,
      references: relation.config.references
    };
  }
  const referencedTableTsName = tableNamesMap[getTableUniqueName(relation.referencedTable)];
  if (!referencedTableTsName) {
    throw new Error(
      `Table "${relation.referencedTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const referencedTableConfig = schema[referencedTableTsName];
  if (!referencedTableConfig) {
    throw new Error(`Table "${referencedTableTsName}" not found in schema`);
  }
  const sourceTable = relation.sourceTable;
  const sourceTableTsName = tableNamesMap[getTableUniqueName(sourceTable)];
  if (!sourceTableTsName) {
    throw new Error(
      `Table "${sourceTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const reverseRelations = [];
  for (const referencedTableRelation of Object.values(
    referencedTableConfig.relations
  )) {
    if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
      reverseRelations.push(referencedTableRelation);
    }
  }
  if (reverseRelations.length > 1) {
    throw relation.relationName ? new Error(
      `There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`
    ) : new Error(
      `There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[Table.Symbol.Name]}". Please specify relation name`
    );
  }
  if (reverseRelations[0] && is(reverseRelations[0], One) && reverseRelations[0].config) {
    return {
      fields: reverseRelations[0].config.references,
      references: reverseRelations[0].config.fields
    };
  }
  throw new Error(
    `There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`
  );
}
function createTableRelationsHelpers(sourceTable) {
  return {
    one: createOne(sourceTable),
    many: createMany(sourceTable)
  };
}
function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
  const result = {};
  for (const [
    selectionItemIndex,
    selectionItem
  ] of buildQueryResultSelection.entries()) {
    if (selectionItem.isJson) {
      const relation = tableConfig.relations[selectionItem.tsKey];
      const rawSubRows = row[selectionItemIndex];
      const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
      result[selectionItem.tsKey] = is(relation, One) ? subRows && mapRelationalRow(
        tablesConfig,
        tablesConfig[selectionItem.relationTableTsKey],
        subRows,
        selectionItem.selection,
        mapColumnValue
      ) : subRows.map(
        (subRow) => mapRelationalRow(
          tablesConfig,
          tablesConfig[selectionItem.relationTableTsKey],
          subRow,
          selectionItem.selection,
          mapColumnValue
        )
      );
    } else {
      const value = mapColumnValue(row[selectionItemIndex]);
      const field = selectionItem.field;
      let decoder;
      if (is(field, Column)) {
        decoder = field;
      } else if (is(field, SQL)) {
        decoder = field.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      result[selectionItem.tsKey] = value === null ? null : decoder.mapFromDriverValue(value);
    }
  }
  return result;
}

// supabase/functions/payroll-api/generated/revenue-calculator.ts
function calculateRevenue(role, items, values) {
  if (role !== "super_admin") throw new Error("Only Super Admin can use the revenue calculator.");
  if (!values || typeof values !== "object") throw new Error("Enter the billing and cost assumptions.");
  for (const key of ["serviceChargePercent", "employerCost", "otherBilling", "operatingCost", "referralBonus", "gstPercent"]) {
    if (typeof values[key] !== "number" || !Number.isFinite(values[key]) || values[key] < 0 || values[key] > (key.endsWith("Percent") ? 100 : 1e10)) throw new Error(`Enter a valid non-negative ${key}.`);
  }
  if (!["salary", "salary_plus_employer_cost"].includes(values.feeBasis)) throw new Error("Select a valid service-charge basis.");
  const seen = /* @__PURE__ */ new Set();
  for (const item of items) {
    if (seen.has(item.employeeId)) throw new Error("Duplicate employee in this payroll. Review the payroll before calculating revenue.");
    seen.add(item.employeeId);
    if (![item.grossEarnings, item.payableDays, item.overtimeHours].every((v) => Number.isFinite(v) && v >= 0)) throw new Error("Payroll has invalid salary or working values.");
  }
  const money = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
  const earnedSalary = money(items.reduce((sum, item) => sum + item.grossEarnings, 0));
  const payableDays = money(items.reduce((sum, item) => sum + item.payableDays, 0));
  const overtimeHours = money(items.reduce((sum, item) => sum + item.overtimeHours, 0));
  const feeBasisAmount = money(earnedSalary + (values.feeBasis === "salary_plus_employer_cost" ? values.employerCost : 0));
  const serviceCharge = money(feeBasisAmount * values.serviceChargePercent / 100);
  const revenueExcludingGst = money(earnedSalary + values.employerCost + serviceCharge + values.otherBilling);
  const gst = money(revenueExcludingGst * values.gstPercent / 100);
  const totalCost = money(earnedSalary + values.employerCost + values.operatingCost + values.referralBonus);
  const contribution = money(revenueExcludingGst - totalCost);
  return { employeeCount: items.length, payableDays, overtimeHours, earnedSalary, feeBasisAmount, serviceCharge, revenueExcludingGst, gst, invoiceTotal: money(revenueExcludingGst + gst), totalCost, contribution, marginPercent: revenueExcludingGst ? money(contribution / revenueExcludingGst * 100) : 0 };
}

// supabase/functions/payroll-api/generated/revenue-projection.ts
var revenueMoney = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
function requireRevenueAdmin(role) {
  if (role !== "super_admin") throw new Error("Only Super Admin can access revenue projections.");
}
function numeric2(value, name, min = 0, max = 1e10) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
}
function dateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)
    throw new Error("Enter a valid calendar date.");
  return value;
}
function shiftDate(value, days) {
  const date2 = /* @__PURE__ */ new Date(`${dateOnly(value)}T00:00:00Z`);
  date2.setUTCDate(date2.getUTCDate() + days);
  return date2.toISOString().slice(0, 10);
}
function monthDates(month) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Choose a month between 2000 and 2099.");
  const count = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}
function indiaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
}
function defaultRevenueMonth(month, unit, rule) {
  return {
    days: monthDates(month).map((date2) => {
      const sunday = new Date(date2).getUTCDay() === 0;
      return { date: date2, kind: sunday ? "week_off" : "working", working: !sunday, paid: !sunday || Boolean(rule?.paidWeekOff), label: sunday ? "Sunday" : "" };
    }),
    salaryDivisor: unit.attendanceWorkingDays || 26,
    standardHours: 8,
    overtimeMultiplier: Number(unit.overtimeMultiplier) || 1,
    overtimeHourlyRate: Number(rule?.overtimeHourlyRate) || 0,
    holidayWorkMultiplier: 1,
    paidLeave: Boolean(rule?.paidLeave),
    paidWeekOff: Boolean(rule?.paidWeekOff),
    paidHolidays: Boolean(rule?.paidWeekOff),
    employerCostPercent: 0,
    serviceChargePercent: 0,
    feeBasis: "salary",
    otherBillingPerDay: 0,
    operatingCostPerDay: 0,
    fallbackDailySalary: 0,
    recruitmentDailySalary: 0,
    fallbackAttendancePercent: 100,
    fallbackOtHours: 0,
    monthlyTarget: 0
  };
}
function validateRevenueMonth(month, value) {
  const dates = monthDates(month);
  if (!value || typeof value !== "object") throw new Error("Monthly calendar and billing setup are required.");
  const c = value;
  if (!Array.isArray(c.days) || c.days.length !== dates.length) throw new Error("Configure every day in the calendar month.");
  const days = dates.map((date2) => {
    const matches = c.days.filter((d2) => d2 && d2.date === date2);
    if (matches.length !== 1) throw new Error("Each date must occur exactly once in this month.");
    const d = matches[0];
    if (!["working", "week_off", "government_holiday", "closure"].includes(d.kind) || typeof d.working !== "boolean" || typeof d.paid !== "boolean" || typeof d.label !== "string" || d.label.length > 120)
      throw new Error(`Invalid calendar setup for ${date2}.`);
    if (d.kind === "government_holiday" && !d.label.trim()) throw new Error(`Enter the government holiday name for ${date2}.`);
    return { date: date2, kind: d.kind, working: d.working, paid: d.paid, label: d.label.trim() };
  });
  for (const k of ["paidLeave", "paidWeekOff", "paidHolidays"])
    if (typeof c[k] !== "boolean") throw new Error("Confirm the paid leave and holiday rules.");
  if (!["salary", "salary_plus_employer_cost"].includes(c.feeBasis)) throw new Error("Choose a valid service-charge basis.");
  return {
    days,
    salaryDivisor: numeric2(c.salaryDivisor, "Salary divisor", 1, 31),
    standardHours: numeric2(c.standardHours, "Standard hours", 1, 24),
    overtimeMultiplier: numeric2(c.overtimeMultiplier, "OT multiplier", 0, 5),
    overtimeHourlyRate: numeric2(c.overtimeHourlyRate, "Base OT hourly rate", 0, 1e6),
    holidayWorkMultiplier: numeric2(c.holidayWorkMultiplier, "Holiday work multiplier", 1, 5),
    paidLeave: c.paidLeave,
    paidWeekOff: c.paidWeekOff,
    paidHolidays: c.paidHolidays,
    employerCostPercent: numeric2(c.employerCostPercent, "Employer cost percentage", 0, 100),
    serviceChargePercent: numeric2(c.serviceChargePercent, "Service charge", 0, 100),
    feeBasis: c.feeBasis,
    otherBillingPerDay: numeric2(c.otherBillingPerDay, "Other billing per payable day", 0, 1e6),
    operatingCostPerDay: numeric2(c.operatingCostPerDay, "Operating cost per payable day", 0, 1e6),
    fallbackDailySalary: numeric2(c.fallbackDailySalary, "Fallback daily salary", 0, 1e6),
    recruitmentDailySalary: numeric2(c.recruitmentDailySalary, "New recruit daily salary", 0, 1e6),
    fallbackAttendancePercent: numeric2(c.fallbackAttendancePercent, "Fallback attendance", 0, 100),
    fallbackOtHours: numeric2(c.fallbackOtHours, "Fallback OT", 0, 24 - c.standardHours),
    monthlyTarget: numeric2(c.monthlyTarget, "Monthly revenue target")
  };
}
function emptyAmounts() {
  return { workedDays: 0, payableDays: 0, overtimeHours: 0, salary: 0, employerCost: 0, serviceCharge: 0, otherBilling: 0, operatingCost: 0, revenue: 0, contribution: 0 };
}
function addAmounts(target, source) {
  for (const key of Object.keys(target)) target[key] += source[key];
}
function rounded(a) {
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, revenueMoney(v)]));
}
function dailyRow(date2) {
  return { date: date2, actual: emptyAmounts(), pending: emptyAmounts(), future: emptyAmounts(), recordedEntries: 0, pendingEntries: 0, expectedEmployees: 0 };
}
function dailySalary(employee, config) {
  const salary = Number(employee.salaryAmount);
  return salary > 0 ? employee.salaryBasis === "daily" ? salary : salary / config.salaryDivisor : config.fallbackDailySalary;
}
function inEmployment(employee, date2) {
  return employee.dateOfJoining <= date2 && (!employee.dateOfLeaving || employee.dateOfLeaving >= date2);
}
function eligibleEstimate(employee, date2, cutoff) {
  return inEmployment(employee, date2) && (employee.status === "active" || date2 <= cutoff && Boolean(employee.dateOfLeaving));
}
function bill(config, rate, worked, paid, overtime, holidayWork = false) {
  const salary = rate * paid + (holidayWork ? rate * worked * (config.holidayWorkMultiplier - 1) : 0) + overtime * (config.overtimeHourlyRate || rate / config.standardHours) * config.overtimeMultiplier;
  const employerCost = salary * config.employerCostPercent / 100;
  const serviceCharge = (salary + (config.feeBasis === "salary_plus_employer_cost" ? employerCost : 0)) * config.serviceChargePercent / 100;
  const otherBilling = paid * config.otherBillingPerDay, operatingCost = paid * config.operatingCostPerDay;
  const revenue = salary + employerCost + serviceCharge + otherBilling;
  return { workedDays: worked, payableDays: paid, overtimeHours: overtime, salary, employerCost, serviceCharge, otherBilling, operatingCost, revenue, contribution: revenue - salary - employerCost - operatingCost };
}
function expectedDay(c, day, rate, attendance, leave, ot) {
  const worked = day.working ? attendance : 0;
  const paid = day.working ? attendance + leave : Number(day.paid);
  return bill(c, rate, worked, paid, worked * ot, day.kind === "government_holiday");
}
function calculateRevenueProjection(role, source, month, asOfDate, today = indiaToday()) {
  requireRevenueAdmin(role);
  const dates = monthDates(month), cutoff = dateOnly(asOfDate), last = dates[dates.length - 1];
  if (cutoff > dateOnly(today) || cutoff > last) throw new Error("Actuals cutoff cannot be after today or the end of the selected month.");
  const result = {
    month,
    asOfDate: cutoff,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ready: false,
    issues: [],
    warnings: [],
    units: [],
    daily: dates.map(dailyRow),
    actual: emptyAmounts(),
    pending: emptyAmounts(),
    future: emptyAmounts(),
    total: emptyAmounts(),
    liveEmployees: 0,
    pendingEntries: 0,
    recordedEntries: 0,
    target: 0,
    recruitmentPlans: [],
    scenario: null
  };
  if (!source.units.length) result.issues.push("No clients match this selection. Add a client before planning recruitment.");
  const configs = /* @__PURE__ */ new Map();
  const uniqueEmployeeIds = /* @__PURE__ */ new Set(), attendanceIndex = /* @__PURE__ */ new Map();
  for (const e of source.employees) {
    if (uniqueEmployeeIds.has(e.id)) throw new Error("Duplicate employee in revenue data.");
    uniqueEmployeeIds.add(e.id);
  }
  for (const a of source.attendance) {
    const key = `${a.employeeId}|${a.attendanceDate}`;
    if (attendanceIndex.has(key)) throw new Error("Duplicate employee/date attendance. Resolve this before projecting revenue.");
    attendanceIndex.set(key, a);
  }
  for (const unit of source.units) {
    const name = `${unit.clientName} \xB7 ${unit.unitName}`;
    const plan = source.plans.find((p) => p.unitId === unit.id && p.month === month);
    if (!plan?.confirmedAt) {
      result.issues.push(`${name}: confirm this month's calendar and billing setup.`);
      continue;
    }
    const config = validateRevenueMonth(month, plan.config);
    configs.set(unit.id, config);
    const people = source.employees.filter((e) => e.clientUnitId === unit.id && e.employmentType !== "direct" && e.dateOfJoining <= last && (!e.dateOfLeaving || e.dateOfLeaving >= dates[0]));
    const missing = people.filter((e) => dailySalary(e, config) <= 0 && (e.status === "active" || source.attendance.some((a) => a.employeeId === e.id && a.attendanceDate >= dates[0] && a.attendanceDate <= cutoff)));
    if (missing.length) result.issues.push(`${name}: ${missing.length} employee(s) need a salary rate or an explicit fallback daily salary in monthly setup.`);
  }
  if (result.issues.length) return result;
  const historyStart = shiftDate(cutoff, -27);
  for (const unit of source.units) {
    const config = configs.get(unit.id);
    const plan = source.plans.find((p) => p.unitId === unit.id && p.month === month);
    const allPeople = source.employees.filter((e) => e.clientUnitId === unit.id && e.employmentType !== "direct");
    const people = allPeople.filter((e) => e.dateOfJoining <= last && (!e.dateOfLeaving || e.dateOfLeaving >= dates[0]));
    const peopleById = new Map(allPeople.map((e) => [e.id, e]));
    const history = source.attendance.filter((a) => {
      const employee = peopleById.get(a.employeeId);
      const day = config.days.find((d) => d.date === a.attendanceDate);
      return employee && inEmployment(employee, a.attendanceDate) && a.attendanceDate >= historyStart && a.attendanceDate <= cutoff && (!day || day.working) && ["P", "HP", "HD", "A", "L"].includes(a.statusCode);
    });
    const present = (code) => code === "P" || code === "HP" ? 1 : code === "HD" ? 0.5 : 0;
    const historyWorked = history.reduce((sum, a) => sum + present(a.statusCode), 0);
    const attendance = history.length ? historyWorked / history.length : config.fallbackAttendancePercent / 100;
    const leave = config.paidLeave && history.length ? history.filter((a) => a.statusCode === "L").length / history.length : 0;
    const ot = historyWorked ? history.reduce((sum, a) => sum + (present(a.statusCode) ? Number(a.overtimeHours) : 0), 0) / historyWorked : history.length ? 0 : config.fallbackOtHours;
    const livePeople = allPeople.filter((e) => eligibleEstimate(e, cutoff, cutoff));
    const rates = people.filter((e) => e.status === "active").map((e) => dailySalary(e, config)).filter((r) => r > 0);
    const recruitmentRate = config.recruitmentDailySalary || (rates.length ? rates.reduce((n, r) => n + r, 0) / rates.length : config.fallbackDailySalary);
    const u = {
      unitId: unit.id,
      vendorId: unit.vendorId,
      company: source.companies.find((c) => c.id === unit.vendorId)?.name || unit.vendorId,
      client: unit.clientName,
      unit: unit.unitName,
      planRevision: plan.revision,
      confirmedAt: plan.confirmedAt,
      workingDays: config.days.filter((d) => d.working).length,
      paidClosedDays: config.days.filter((d) => !d.working && d.paid).length,
      liveEmployees: livePeople.length,
      salaryFallbackEmployees: people.filter((e) => Number(e.salaryAmount) <= 0 && e.status === "active").length,
      historyEntries: history.length,
      attendancePercent: attendance * 100,
      paidLeavePercent: leave * 100,
      otPerWorkedDay: ot,
      assumptionSource: history.length ? `Recorded attendance in the 28 days ending ${cutoff} (${history.length} employee-day entries)` : "Monthly fallback assumptions; no usable attendance history in the last 28 days",
      recruitmentDailySalary: recruitmentRate,
      target: config.monthlyTarget,
      actual: emptyAmounts(),
      pending: emptyAmounts(),
      future: emptyAmounts(),
      total: emptyAmounts(),
      daily: dates.map(dailyRow)
    };
    let closedWork = 0, invalidEntries = 0;
    for (let i = 0; i < dates.length; i++) {
      const day = config.days[i], row = u.daily[i];
      for (const employee of people) {
        const entry = day.date <= cutoff ? attendanceIndex.get(`${employee.id}|${day.date}`) : void 0;
        if (entry && inEmployment(employee, day.date)) {
          if (!["P", "HP", "HD", "A", "L", "WO", "H"].includes(entry.statusCode) || !Number.isFinite(Number(entry.overtimeHours)) || Number(entry.overtimeHours) < 0 || Number(entry.overtimeHours) > 24) {
            invalidEntries++;
          } else {
            const worked = present(entry.statusCode);
            const paid = worked || (entry.statusCode === "L" && config.paidLeave ? 1 : ["WO", "H"].includes(entry.statusCode) ? Number(!day.working ? day.paid : entry.statusCode === "WO" ? config.paidWeekOff : config.paidHolidays) : 0);
            addAmounts(row.actual, bill(config, dailySalary(employee, config), worked, paid, Number(entry.overtimeHours), entry.statusCode === "HP" || worked > 0 && day.kind === "government_holiday"));
            row.recordedEntries++;
            if (worked && !day.working) closedWork++;
            continue;
          }
        }
        if (!eligibleEstimate(employee, day.date, cutoff)) continue;
        if (day.working) row.expectedEmployees++;
        const amount = expectedDay(config, day, dailySalary(employee, config), attendance, leave, ot);
        if (day.date <= cutoff) {
          addAmounts(row.pending, amount);
          if (day.working || day.paid) row.pendingEntries++;
        } else addAmounts(row.future, amount);
      }
      row.actual = rounded(row.actual);
      row.pending = rounded(row.pending);
      row.future = rounded(row.future);
      addAmounts(u.actual, row.actual);
      addAmounts(u.pending, row.pending);
      addAmounts(u.future, row.future);
      const overall = result.daily[i];
      for (const key of ["actual", "pending", "future"]) addAmounts(overall[key], row[key]);
      overall.recordedEntries += row.recordedEntries;
      overall.pendingEntries += row.pendingEntries;
      overall.expectedEmployees += row.expectedEmployees;
    }
    for (const key of ["actual", "pending", "future"]) {
      u[key] = rounded(u[key]);
      addAmounts(u.total, u[key]);
      addAmounts(result[key], u[key]);
    }
    u.total = rounded(u.total);
    if (!history.length) result.warnings.push(`${u.client} \xB7 ${u.unit}: using confirmed monthly fallback attendance and OT assumptions.`);
    if (u.salaryFallbackEmployees) result.warnings.push(`${u.client} \xB7 ${u.unit}: ${u.salaryFallbackEmployees} employees use the configured fallback salary; billing remains provisional until their master rates are updated.`);
    if (closedWork) result.warnings.push(`${u.client} \xB7 ${u.unit}: ${closedWork} attendance entries show work on closed calendar days. Recorded work is included; review the calendar.`);
    if (invalidEntries) result.warnings.push(`${u.client} \xB7 ${u.unit}: ${invalidEntries} invalid attendance entries are treated as pending.`);
    if (people.some((e) => e.status !== "active" && !e.dateOfLeaving)) result.warnings.push(`${u.client} \xB7 ${u.unit}: inactive employees without leaving dates contribute recorded actuals only.`);
    result.units.push(u);
    result.liveEmployees += u.liveEmployees;
    result.target += u.target;
  }
  for (const key of ["actual", "pending", "future"]) {
    result[key] = rounded(result[key]);
    addAmounts(result.total, result[key]);
  }
  result.total = rounded(result.total);
  result.target = revenueMoney(result.target);
  for (const row of result.daily) {
    row.actual = rounded(row.actual);
    row.pending = rounded(row.pending);
    row.future = rounded(row.future);
    result.pendingEntries += row.pendingEntries;
    result.recordedEntries += row.recordedEntries;
  }
  result.ready = true;
  const joining = cutoff < dates[0] ? dates[0] : shiftDate(cutoff, 1);
  if (joining <= last) for (const u of result.units.filter((u2) => u2.target > 0)) {
    const unitResult = { ...result, units: [u], total: u.total };
    result.recruitmentPlans.push(calculateRevenueScenario(role, source, unitResult, {
      direction: "revenue_to_manpower",
      unitId: u.unitId,
      joiningDate: joining,
      targetRevenue: u.target,
      manpower: 0,
      countMode: "additional",
      dailySalary: u.recruitmentDailySalary,
      attendancePercent: u.attendancePercent,
      otPerWorkedDay: Math.min(otLimit(configs.get(u.unitId)), u.otPerWorkedDay)
    }));
  }
  return result;
}
var otLimit = (c) => 24 - c.standardHours;
function calculateRevenueScenario(role, source, baseline, input) {
  requireRevenueAdmin(role);
  if (!baseline.ready) throw new Error("Confirm all monthly setups and resolve missing rates before planning recruitment.");
  if (!input || !["revenue_to_manpower", "manpower_to_revenue"].includes(input.direction) || !["additional", "total"].includes(input.countMode)) throw new Error("Choose a valid calculator and manpower count type.");
  const u = baseline.units.find((u2) => u2.unitId === input.unitId);
  const plan = source.plans.find((p) => p.unitId === input.unitId && p.month === baseline.month);
  if (!u || !plan?.confirmedAt) throw new Error("Choose a deployment client within the selected report scope.");
  const c = validateRevenueMonth(baseline.month, plan.config), join = dateOnly(input.joiningDate);
  const dates = monthDates(baseline.month);
  if (join <= baseline.asOfDate || join < dates[0] || join > dates[dates.length - 1]) throw new Error("Joining date must be after the actuals cutoff and within the selected month.");
  numeric2(input.targetRevenue, "Target revenue");
  numeric2(input.manpower, "Manpower", 0, 1e6);
  if (!Number.isInteger(input.manpower)) throw new Error("Manpower must be a whole number.");
  numeric2(input.dailySalary, "New recruit daily salary", 0, 1e6);
  numeric2(input.attendancePercent, "Expected attendance", 0, 100);
  numeric2(input.otPerWorkedDay, "OT per worked day", 0, otLimit(c));
  const scopeUnits = new Set(baseline.units.map((unit) => unit.unitId));
  const existing = source.employees.filter((e) => scopeUnits.has(e.clientUnitId) && e.employmentType !== "direct" && eligibleEstimate(e, join, baseline.asOfDate)).length;
  if (input.direction === "manpower_to_revenue" && input.countMode === "total" && input.manpower < existing) throw new Error(`Desired total must be at least ${existing}, the existing employees available on the joining date.`);
  const contribution = emptyAmounts();
  for (const day of c.days.filter((d) => d.date >= join)) addAmounts(contribution, expectedDay(c, day, input.dailySalary, input.attendancePercent / 100, 0, input.otPerWorkedDay));
  const perRecruit = revenueMoney(contribution.revenue);
  const gap = Math.max(0, revenueMoney(input.targetRevenue - baseline.total.revenue));
  let recruits = input.direction === "revenue_to_manpower" ? gap === 0 ? 0 : perRecruit > 0 && input.dailySalary > 0 ? Math.ceil(gap / perRecruit) : null : input.countMode === "additional" ? input.manpower : input.manpower - existing;
  if (recruits !== null && recruits > 1e6) recruits = null;
  const attainable = recruits !== null && (recruits === 0 || input.dailySalary > 0 && perRecruit > 0);
  const additional = attainable ? revenueMoney((recruits || 0) * perRecruit) : 0;
  return {
    ...input,
    client: `${u.company} / ${u.client} / ${u.unit}`,
    existingAtJoining: existing,
    additionalRecruits: attainable ? recruits : null,
    totalAtJoining: attainable ? existing + (recruits || 0) : null,
    perRecruitRevenue: perRecruit,
    remainingWorkingDays: c.days.filter((d) => d.date >= join && d.working).length,
    additionalRevenue: additional,
    baselineRevenue: baseline.total.revenue,
    achievableRevenue: revenueMoney(baseline.total.revenue + additional),
    targetGap: revenueMoney(Math.max(0, input.targetRevenue - baseline.total.revenue - additional)),
    attainable,
    explanation: !attainable ? "No achievable recruitment result: check the salary rate, expected attendance and remaining payable days." : recruits === 0 ? "The baseline already meets this target or no additional recruitment is requested." : `Deploy ${recruits} additional employee(s) to ${u.client} \xB7 ${u.unit} from ${join}. Existing actuals and workforce forecast are preserved.`
  };
}

// node_modules/drizzle-orm/postgres-js/driver.js
import pgClient from "npm:postgres@3.4.7";

// node_modules/drizzle-orm/selection-proxy.js
var SelectionProxyHandler = class _SelectionProxyHandler {
  static [entityKind] = "SelectionProxyHandler";
  config;
  constructor(config) {
    this.config = { ...config };
  }
  get(subquery, prop) {
    if (prop === "_") {
      return {
        ...subquery["_"],
        selectedFields: new Proxy(
          subquery._.selectedFields,
          this
        )
      };
    }
    if (prop === ViewBaseConfig) {
      return {
        ...subquery[ViewBaseConfig],
        selectedFields: new Proxy(
          subquery[ViewBaseConfig].selectedFields,
          this
        )
      };
    }
    if (typeof prop === "symbol") {
      return subquery[prop];
    }
    const columns = is(subquery, Subquery) ? subquery._.selectedFields : is(subquery, View) ? subquery[ViewBaseConfig].selectedFields : subquery;
    const value = columns[prop];
    if (is(value, SQL.Aliased)) {
      if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
        return value.sql;
      }
      const newValue = value.clone();
      newValue.isSelectionField = true;
      return newValue;
    }
    if (is(value, SQL)) {
      if (this.config.sqlBehavior === "sql") {
        return value;
      }
      throw new Error(
        `You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`
      );
    }
    if (is(value, Column)) {
      if (this.config.alias) {
        return new Proxy(
          value,
          new ColumnAliasProxyHandler(
            new Proxy(
              value.table,
              new TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false)
            )
          )
        );
      }
      return value;
    }
    if (typeof value !== "object" || value === null) {
      return value;
    }
    return new Proxy(value, new _SelectionProxyHandler(this.config));
  }
};

// node_modules/drizzle-orm/pg-core/indexes.js
var IndexBuilderOn = class {
  constructor(unique, name) {
    this.unique = unique;
    this.name = name;
  }
  static [entityKind] = "PgIndexBuilderOn";
  on(...columns) {
    return new IndexBuilder(
      columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
        return clonedIndexedColumn;
      }),
      this.unique,
      false,
      this.name
    );
  }
  onOnly(...columns) {
    return new IndexBuilder(
      columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = it.defaultConfig;
        return clonedIndexedColumn;
      }),
      this.unique,
      true,
      this.name
    );
  }
  /**
   * Specify what index method to use. Choices are `btree`, `hash`, `gist`, `spgist`, `gin`, `brin`, or user-installed access methods like `bloom`. The default method is `btree.
   *
   * If you have the `pg_vector` extension installed in your database, you can use the `hnsw` and `ivfflat` options, which are predefined types.
   *
   * **You can always specify any string you want in the method, in case Drizzle doesn't have it natively in its types**
   *
   * @param method The name of the index method to be used
   * @param columns
   * @returns
   */
  using(method, ...columns) {
    return new IndexBuilder(
      columns.map((it) => {
        if (is(it, SQL)) {
          return it;
        }
        it = it;
        const clonedIndexedColumn = new IndexedColumn(it.name, !!it.keyAsName, it.columnType, it.indexConfig);
        it.indexConfig = JSON.parse(JSON.stringify(it.defaultConfig));
        return clonedIndexedColumn;
      }),
      this.unique,
      true,
      this.name,
      method
    );
  }
};
var IndexBuilder = class {
  static [entityKind] = "PgIndexBuilder";
  /** @internal */
  config;
  constructor(columns, unique, only, name, method = "btree") {
    this.config = {
      name,
      columns,
      unique,
      only,
      method
    };
  }
  concurrently() {
    this.config.concurrently = true;
    return this;
  }
  with(obj) {
    this.config.with = obj;
    return this;
  }
  where(condition) {
    this.config.where = condition;
    return this;
  }
  /** @internal */
  build(table) {
    return new Index(this.config, table);
  }
};
var Index = class {
  static [entityKind] = "PgIndex";
  config;
  constructor(config, table) {
    this.config = { ...config, table };
  }
};
function index(name) {
  return new IndexBuilderOn(false, name);
}
function uniqueIndex(name) {
  return new IndexBuilderOn(true, name);
}

// node_modules/drizzle-orm/casing.js
function toSnakeCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.map((word) => word.toLowerCase()).join("_");
}
function toCamelCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.reduce((acc, word, i) => {
    const formattedWord = i === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
    return acc + formattedWord;
  }, "");
}
function noopCase(input) {
  return input;
}
var CasingCache = class {
  static [entityKind] = "CasingCache";
  /** @internal */
  cache = {};
  cachedTables = {};
  convert;
  constructor(casing) {
    this.convert = casing === "snake_case" ? toSnakeCase : casing === "camelCase" ? toCamelCase : noopCase;
  }
  getColumnCasing(column) {
    if (!column.keyAsName) return column.name;
    const schema = column.table[Table.Symbol.Schema] ?? "public";
    const tableName = column.table[Table.Symbol.OriginalName];
    const key = `${schema}.${tableName}.${column.name}`;
    if (!this.cache[key]) {
      this.cacheTable(column.table);
    }
    return this.cache[key];
  }
  cacheTable(table) {
    const schema = table[Table.Symbol.Schema] ?? "public";
    const tableName = table[Table.Symbol.OriginalName];
    const tableKey = `${schema}.${tableName}`;
    if (!this.cachedTables[tableKey]) {
      for (const column of Object.values(table[Table.Symbol.Columns])) {
        const columnKey = `${tableKey}.${column.name}`;
        this.cache[columnKey] = this.convert(column.name);
      }
      this.cachedTables[tableKey] = true;
    }
  }
  clearCache() {
    this.cache = {};
    this.cachedTables = {};
  }
};

// node_modules/drizzle-orm/pg-core/view-base.js
var PgViewBase = class extends View {
  static [entityKind] = "PgViewBase";
};

// node_modules/drizzle-orm/pg-core/dialect.js
var PgDialect = class {
  static [entityKind] = "PgDialect";
  /** @internal */
  casing;
  constructor(config) {
    this.casing = new CasingCache(config?.casing);
  }
  async migrate(migrations, session, config) {
    const migrationsTable = typeof config === "string" ? "__drizzle_migrations" : config.migrationsTable ?? "__drizzle_migrations";
    const migrationsSchema = typeof config === "string" ? "drizzle" : config.migrationsSchema ?? "drizzle";
    const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`;
    await session.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(migrationsSchema)}`);
    await session.execute(migrationTableCreate);
    const dbMigrations = await session.all(
      sql`select id, hash, created_at from ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} order by created_at desc limit 1`
    );
    const lastDbMigration = dbMigrations[0];
    await session.transaction(async (tx) => {
      for await (const migration of migrations) {
        if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
          for (const stmt of migration.sql) {
            await tx.execute(sql.raw(stmt));
          }
          await tx.execute(
            sql`insert into ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`
          );
        }
      }
    });
  }
  escapeName(name) {
    return `"${name.replace(/"/g, '""')}"`;
  }
  escapeParam(num) {
    return `$${num + 1}`;
  }
  escapeString(str) {
    return `'${str.replace(/'/g, "''")}'`;
  }
  buildWithCTE(queries) {
    if (!queries?.length) return void 0;
    const withSqlChunks = [sql`with `];
    for (const [i, w] of queries.entries()) {
      withSqlChunks.push(sql`${sql.identifier(w._.alias)} as (${w._.sql})`);
      if (i < queries.length - 1) {
        withSqlChunks.push(sql`, `);
      }
    }
    withSqlChunks.push(sql` `);
    return sql.join(withSqlChunks);
  }
  buildDeleteQuery({ table, where, returning, withList }) {
    const withSql = this.buildWithCTE(withList);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
    const whereSql = where ? sql` where ${where}` : void 0;
    return sql`${withSql}delete from ${table}${whereSql}${returningSql}`;
  }
  buildUpdateSet(table, set) {
    const tableColumns = table[Table.Symbol.Columns];
    const columnNames = Object.keys(tableColumns).filter(
      (colName) => set[colName] !== void 0 || tableColumns[colName]?.onUpdateFn !== void 0
    );
    const setSize = columnNames.length;
    return sql.join(columnNames.flatMap((colName, i) => {
      const col = tableColumns[colName];
      const onUpdateFnResult = col.onUpdateFn?.();
      const value = set[colName] ?? (is(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col));
      const res = sql`${sql.identifier(this.casing.getColumnCasing(col))} = ${value}`;
      if (i < setSize - 1) {
        return [res, sql.raw(", ")];
      }
      return [res];
    }));
  }
  buildUpdateQuery({ table, set, where, returning, withList, from, joins }) {
    const withSql = this.buildWithCTE(withList);
    const tableName = table[PgTable.Symbol.Name];
    const tableSchema = table[PgTable.Symbol.Schema];
    const origTableName = table[PgTable.Symbol.OriginalName];
    const alias = tableName === origTableName ? void 0 : tableName;
    const tableSql = sql`${tableSchema ? sql`${sql.identifier(tableSchema)}.` : void 0}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`}`;
    const setSql = this.buildUpdateSet(table, set);
    const fromSql = from && sql.join([sql.raw(" from "), this.buildFromTable(from)]);
    const joinsSql = this.buildJoins(joins);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: !from })}` : void 0;
    const whereSql = where ? sql` where ${where}` : void 0;
    return sql`${withSql}update ${tableSql} set ${setSql}${fromSql}${joinsSql}${whereSql}${returningSql}`;
  }
  /**
   * Builds selection SQL with provided fields/expressions
   *
   * Examples:
   *
   * `select <selection> from`
   *
   * `insert ... returning <selection>`
   *
   * If `isSingleTable` is true, then columns won't be prefixed with table name
   */
  buildSelection(fields, { isSingleTable = false } = {}) {
    const columnsLen = fields.length;
    const chunks = fields.flatMap(({ field }, i) => {
      const chunk = [];
      if (is(field, SQL.Aliased) && field.isSelectionField) {
        chunk.push(sql.identifier(field.fieldAlias));
      } else if (is(field, SQL.Aliased) || is(field, SQL)) {
        const query = is(field, SQL.Aliased) ? field.sql : field;
        if (isSingleTable) {
          chunk.push(
            new SQL(
              query.queryChunks.map((c) => {
                if (is(c, PgColumn)) {
                  return sql.identifier(this.casing.getColumnCasing(c));
                }
                return c;
              })
            )
          );
        } else {
          chunk.push(query);
        }
        if (is(field, SQL.Aliased)) {
          chunk.push(sql` as ${sql.identifier(field.fieldAlias)}`);
        }
      } else if (is(field, Column)) {
        if (isSingleTable) {
          chunk.push(sql.identifier(this.casing.getColumnCasing(field)));
        } else {
          chunk.push(field);
        }
      } else if (is(field, Subquery)) {
        const entries = Object.entries(field._.selectedFields);
        if (entries.length === 1) {
          const entry = entries[0][1];
          const fieldDecoder = is(entry, SQL) ? entry.decoder : is(entry, Column) ? { mapFromDriverValue: (v) => entry.mapFromDriverValue(v) } : entry.sql.decoder;
          if (fieldDecoder) {
            field._.sql.decoder = fieldDecoder;
          }
        }
        chunk.push(field);
      }
      if (i < columnsLen - 1) {
        chunk.push(sql`, `);
      }
      return chunk;
    });
    return sql.join(chunks);
  }
  buildJoins(joins) {
    if (!joins || joins.length === 0) {
      return void 0;
    }
    const joinsArray = [];
    for (const [index2, joinMeta] of joins.entries()) {
      if (index2 === 0) {
        joinsArray.push(sql` `);
      }
      const table = joinMeta.table;
      const lateralSql = joinMeta.lateral ? sql` lateral` : void 0;
      const onSql = joinMeta.on ? sql` on ${joinMeta.on}` : void 0;
      if (is(table, PgTable)) {
        const tableName = table[PgTable.Symbol.Name];
        const tableSchema = table[PgTable.Symbol.Schema];
        const origTableName = table[PgTable.Symbol.OriginalName];
        const alias = tableName === origTableName ? void 0 : joinMeta.alias;
        joinsArray.push(
          sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${tableSchema ? sql`${sql.identifier(tableSchema)}.` : void 0}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`}${onSql}`
        );
      } else if (is(table, View)) {
        const viewName = table[ViewBaseConfig].name;
        const viewSchema = table[ViewBaseConfig].schema;
        const origViewName = table[ViewBaseConfig].originalName;
        const alias = viewName === origViewName ? void 0 : joinMeta.alias;
        joinsArray.push(
          sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${viewSchema ? sql`${sql.identifier(viewSchema)}.` : void 0}${sql.identifier(origViewName)}${alias && sql` ${sql.identifier(alias)}`}${onSql}`
        );
      } else {
        joinsArray.push(
          sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${table}${onSql}`
        );
      }
      if (index2 < joins.length - 1) {
        joinsArray.push(sql` `);
      }
    }
    return sql.join(joinsArray);
  }
  buildFromTable(table) {
    if (is(table, Table) && table[Table.Symbol.IsAlias]) {
      let fullName = sql`${sql.identifier(table[Table.Symbol.OriginalName])}`;
      if (table[Table.Symbol.Schema]) {
        fullName = sql`${sql.identifier(table[Table.Symbol.Schema])}.${fullName}`;
      }
      return sql`${fullName} ${sql.identifier(table[Table.Symbol.Name])}`;
    }
    return table;
  }
  buildSelectQuery({
    withList,
    fields,
    fieldsFlat,
    where,
    having,
    table,
    joins,
    orderBy,
    groupBy,
    limit,
    offset,
    lockingClause,
    distinct,
    setOperators
  }) {
    const fieldsList = fieldsFlat ?? orderSelectedFields(fields);
    for (const f of fieldsList) {
      if (is(f.field, Column) && getTableName(f.field.table) !== (is(table, Subquery) ? table._.alias : is(table, PgViewBase) ? table[ViewBaseConfig].name : is(table, SQL) ? void 0 : getTableName(table)) && !((table2) => joins?.some(
        ({ alias }) => alias === (table2[Table.Symbol.IsAlias] ? getTableName(table2) : table2[Table.Symbol.BaseName])
      ))(f.field.table)) {
        const tableName = getTableName(f.field.table);
        throw new Error(
          `Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`
        );
      }
    }
    const isSingleTable = !joins || joins.length === 0;
    const withSql = this.buildWithCTE(withList);
    let distinctSql;
    if (distinct) {
      distinctSql = distinct === true ? sql` distinct` : sql` distinct on (${sql.join(distinct.on, sql`, `)})`;
    }
    const selection = this.buildSelection(fieldsList, { isSingleTable });
    const tableSql = this.buildFromTable(table);
    const joinsSql = this.buildJoins(joins);
    const whereSql = where ? sql` where ${where}` : void 0;
    const havingSql = having ? sql` having ${having}` : void 0;
    let orderBySql;
    if (orderBy && orderBy.length > 0) {
      orderBySql = sql` order by ${sql.join(orderBy, sql`, `)}`;
    }
    let groupBySql;
    if (groupBy && groupBy.length > 0) {
      groupBySql = sql` group by ${sql.join(groupBy, sql`, `)}`;
    }
    const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
    const offsetSql = offset ? sql` offset ${offset}` : void 0;
    const lockingClauseSql = sql.empty();
    if (lockingClause) {
      const clauseSql = sql` for ${sql.raw(lockingClause.strength)}`;
      if (lockingClause.config.of) {
        clauseSql.append(
          sql` of ${sql.join(
            Array.isArray(lockingClause.config.of) ? lockingClause.config.of : [lockingClause.config.of],
            sql`, `
          )}`
        );
      }
      if (lockingClause.config.noWait) {
        clauseSql.append(sql` nowait`);
      } else if (lockingClause.config.skipLocked) {
        clauseSql.append(sql` skip locked`);
      }
      lockingClauseSql.append(clauseSql);
    }
    const finalQuery = sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}${lockingClauseSql}`;
    if (setOperators.length > 0) {
      return this.buildSetOperations(finalQuery, setOperators);
    }
    return finalQuery;
  }
  buildSetOperations(leftSelect, setOperators) {
    const [setOperator, ...rest] = setOperators;
    if (!setOperator) {
      throw new Error("Cannot pass undefined values to any set operator");
    }
    if (rest.length === 0) {
      return this.buildSetOperationQuery({ leftSelect, setOperator });
    }
    return this.buildSetOperations(
      this.buildSetOperationQuery({ leftSelect, setOperator }),
      rest
    );
  }
  buildSetOperationQuery({
    leftSelect,
    setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
  }) {
    const leftChunk = sql`(${leftSelect.getSQL()}) `;
    const rightChunk = sql`(${rightSelect.getSQL()})`;
    let orderBySql;
    if (orderBy && orderBy.length > 0) {
      const orderByValues = [];
      for (const singleOrderBy of orderBy) {
        if (is(singleOrderBy, PgColumn)) {
          orderByValues.push(sql.identifier(singleOrderBy.name));
        } else if (is(singleOrderBy, SQL)) {
          for (let i = 0; i < singleOrderBy.queryChunks.length; i++) {
            const chunk = singleOrderBy.queryChunks[i];
            if (is(chunk, PgColumn)) {
              singleOrderBy.queryChunks[i] = sql.identifier(chunk.name);
            }
          }
          orderByValues.push(sql`${singleOrderBy}`);
        } else {
          orderByValues.push(sql`${singleOrderBy}`);
        }
      }
      orderBySql = sql` order by ${sql.join(orderByValues, sql`, `)} `;
    }
    const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
    const operatorChunk = sql.raw(`${type} ${isAll ? "all " : ""}`);
    const offsetSql = offset ? sql` offset ${offset}` : void 0;
    return sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
  }
  buildInsertQuery({ table, values: valuesOrSelect, onConflict, returning, withList, select, overridingSystemValue_ }) {
    const valuesSqlList = [];
    const columns = table[Table.Symbol.Columns];
    const colEntries = Object.entries(columns).filter(([_, col]) => !col.shouldDisableInsert());
    const insertOrder = colEntries.map(
      ([, column]) => sql.identifier(this.casing.getColumnCasing(column))
    );
    if (select) {
      const select2 = valuesOrSelect;
      if (is(select2, SQL)) {
        valuesSqlList.push(select2);
      } else {
        valuesSqlList.push(select2.getSQL());
      }
    } else {
      const values = valuesOrSelect;
      valuesSqlList.push(sql.raw("values "));
      for (const [valueIndex, value] of values.entries()) {
        const valueList = [];
        for (const [fieldName, col] of colEntries) {
          const colValue = value[fieldName];
          if (colValue === void 0 || is(colValue, Param) && colValue.value === void 0) {
            if (col.defaultFn !== void 0) {
              const defaultFnResult = col.defaultFn();
              const defaultValue = is(defaultFnResult, SQL) ? defaultFnResult : sql.param(defaultFnResult, col);
              valueList.push(defaultValue);
            } else if (!col.default && col.onUpdateFn !== void 0) {
              const onUpdateFnResult = col.onUpdateFn();
              const newValue = is(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col);
              valueList.push(newValue);
            } else {
              valueList.push(sql`default`);
            }
          } else {
            valueList.push(colValue);
          }
        }
        valuesSqlList.push(valueList);
        if (valueIndex < values.length - 1) {
          valuesSqlList.push(sql`, `);
        }
      }
    }
    const withSql = this.buildWithCTE(withList);
    const valuesSql = sql.join(valuesSqlList);
    const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
    const onConflictSql = onConflict ? sql` on conflict ${onConflict}` : void 0;
    const overridingSql = overridingSystemValue_ === true ? sql`overriding system value ` : void 0;
    return sql`${withSql}insert into ${table} ${insertOrder} ${overridingSql}${valuesSql}${onConflictSql}${returningSql}`;
  }
  buildRefreshMaterializedViewQuery({ view, concurrently, withNoData }) {
    const concurrentlySql = concurrently ? sql` concurrently` : void 0;
    const withNoDataSql = withNoData ? sql` with no data` : void 0;
    return sql`refresh materialized view${concurrentlySql} ${view}${withNoDataSql}`;
  }
  prepareTyping(encoder) {
    if (is(encoder, PgJsonb) || is(encoder, PgJson)) {
      return "json";
    } else if (is(encoder, PgNumeric)) {
      return "decimal";
    } else if (is(encoder, PgTime)) {
      return "time";
    } else if (is(encoder, PgTimestamp) || is(encoder, PgTimestampString)) {
      return "timestamp";
    } else if (is(encoder, PgDate) || is(encoder, PgDateString)) {
      return "date";
    } else if (is(encoder, PgUUID)) {
      return "uuid";
    } else {
      return "none";
    }
  }
  sqlToQuery(sql2, invokeSource) {
    return sql2.toQuery({
      casing: this.casing,
      escapeName: this.escapeName,
      escapeParam: this.escapeParam,
      escapeString: this.escapeString,
      prepareTyping: this.prepareTyping,
      invokeSource
    });
  }
  // buildRelationalQueryWithPK({
  // 	fullSchema,
  // 	schema,
  // 	tableNamesMap,
  // 	table,
  // 	tableConfig,
  // 	queryConfig: config,
  // 	tableAlias,
  // 	isRoot = false,
  // 	joinOn,
  // }: {
  // 	fullSchema: Record<string, unknown>;
  // 	schema: TablesRelationalConfig;
  // 	tableNamesMap: Record<string, string>;
  // 	table: PgTable;
  // 	tableConfig: TableRelationalConfig;
  // 	queryConfig: true | DBQueryConfig<'many', true>;
  // 	tableAlias: string;
  // 	isRoot?: boolean;
  // 	joinOn?: SQL;
  // }): BuildRelationalQueryResult<PgTable, PgColumn> {
  // 	// For { "<relation>": true }, return a table with selection of all columns
  // 	if (config === true) {
  // 		const selectionEntries = Object.entries(tableConfig.columns);
  // 		const selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = selectionEntries.map((
  // 			[key, value],
  // 		) => ({
  // 			dbKey: value.name,
  // 			tsKey: key,
  // 			field: value as PgColumn,
  // 			relationTableTsKey: undefined,
  // 			isJson: false,
  // 			selection: [],
  // 		}));
  // 		return {
  // 			tableTsKey: tableConfig.tsName,
  // 			sql: table,
  // 			selection,
  // 		};
  // 	}
  // 	// let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
  // 	// let selectionForBuild = selection;
  // 	const aliasedColumns = Object.fromEntries(
  // 		Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)]),
  // 	);
  // 	const aliasedRelations = Object.fromEntries(
  // 		Object.entries(tableConfig.relations).map(([key, value]) => [key, aliasedRelation(value, tableAlias)]),
  // 	);
  // 	const aliasedFields = Object.assign({}, aliasedColumns, aliasedRelations);
  // 	let where, hasUserDefinedWhere;
  // 	if (config.where) {
  // 		const whereSql = typeof config.where === 'function' ? config.where(aliasedFields, operators) : config.where;
  // 		where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
  // 		hasUserDefinedWhere = !!where;
  // 	}
  // 	where = and(joinOn, where);
  // 	// const fieldsSelection: { tsKey: string; value: PgColumn | SQL.Aliased; isExtra?: boolean }[] = [];
  // 	let joins: Join[] = [];
  // 	let selectedColumns: string[] = [];
  // 	// Figure out which columns to select
  // 	if (config.columns) {
  // 		let isIncludeMode = false;
  // 		for (const [field, value] of Object.entries(config.columns)) {
  // 			if (value === undefined) {
  // 				continue;
  // 			}
  // 			if (field in tableConfig.columns) {
  // 				if (!isIncludeMode && value === true) {
  // 					isIncludeMode = true;
  // 				}
  // 				selectedColumns.push(field);
  // 			}
  // 		}
  // 		if (selectedColumns.length > 0) {
  // 			selectedColumns = isIncludeMode
  // 				? selectedColumns.filter((c) => config.columns?.[c] === true)
  // 				: Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
  // 		}
  // 	} else {
  // 		// Select all columns if selection is not specified
  // 		selectedColumns = Object.keys(tableConfig.columns);
  // 	}
  // 	// for (const field of selectedColumns) {
  // 	// 	const column = tableConfig.columns[field]! as PgColumn;
  // 	// 	fieldsSelection.push({ tsKey: field, value: column });
  // 	// }
  // 	let initiallySelectedRelations: {
  // 		tsKey: string;
  // 		queryConfig: true | DBQueryConfig<'many', false>;
  // 		relation: Relation;
  // 	}[] = [];
  // 	// let selectedRelations: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
  // 	// Figure out which relations to select
  // 	if (config.with) {
  // 		initiallySelectedRelations = Object.entries(config.with)
  // 			.filter((entry): entry is [typeof entry[0], NonNullable<typeof entry[1]>] => !!entry[1])
  // 			.map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey]! }));
  // 	}
  // 	const manyRelations = initiallySelectedRelations.filter((r) =>
  // 		is(r.relation, Many)
  // 		&& (schema[tableNamesMap[r.relation.referencedTable[Table.Symbol.Name]]!]?.primaryKey.length ?? 0) > 0
  // 	);
  // 	// If this is the last Many relation (or there are no Many relations), we are on the innermost subquery level
  // 	const isInnermostQuery = manyRelations.length < 2;
  // 	const selectedExtras: {
  // 		tsKey: string;
  // 		value: SQL.Aliased;
  // 	}[] = [];
  // 	// Figure out which extras to select
  // 	if (isInnermostQuery && config.extras) {
  // 		const extras = typeof config.extras === 'function'
  // 			? config.extras(aliasedFields, { sql })
  // 			: config.extras;
  // 		for (const [tsKey, value] of Object.entries(extras)) {
  // 			selectedExtras.push({
  // 				tsKey,
  // 				value: mapColumnsInAliasedSQLToAlias(value, tableAlias),
  // 			});
  // 		}
  // 	}
  // 	// Transform `fieldsSelection` into `selection`
  // 	// `fieldsSelection` shouldn't be used after this point
  // 	// for (const { tsKey, value, isExtra } of fieldsSelection) {
  // 	// 	selection.push({
  // 	// 		dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey]!.name,
  // 	// 		tsKey,
  // 	// 		field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
  // 	// 		relationTableTsKey: undefined,
  // 	// 		isJson: false,
  // 	// 		isExtra,
  // 	// 		selection: [],
  // 	// 	});
  // 	// }
  // 	let orderByOrig = typeof config.orderBy === 'function'
  // 		? config.orderBy(aliasedFields, orderByOperators)
  // 		: config.orderBy ?? [];
  // 	if (!Array.isArray(orderByOrig)) {
  // 		orderByOrig = [orderByOrig];
  // 	}
  // 	const orderBy = orderByOrig.map((orderByValue) => {
  // 		if (is(orderByValue, Column)) {
  // 			return aliasedTableColumn(orderByValue, tableAlias) as PgColumn;
  // 		}
  // 		return mapColumnsInSQLToAlias(orderByValue, tableAlias);
  // 	});
  // 	const limit = isInnermostQuery ? config.limit : undefined;
  // 	const offset = isInnermostQuery ? config.offset : undefined;
  // 	// For non-root queries without additional config except columns, return a table with selection
  // 	if (
  // 		!isRoot
  // 		&& initiallySelectedRelations.length === 0
  // 		&& selectedExtras.length === 0
  // 		&& !where
  // 		&& orderBy.length === 0
  // 		&& limit === undefined
  // 		&& offset === undefined
  // 	) {
  // 		return {
  // 			tableTsKey: tableConfig.tsName,
  // 			sql: table,
  // 			selection: selectedColumns.map((key) => ({
  // 				dbKey: tableConfig.columns[key]!.name,
  // 				tsKey: key,
  // 				field: tableConfig.columns[key] as PgColumn,
  // 				relationTableTsKey: undefined,
  // 				isJson: false,
  // 				selection: [],
  // 			})),
  // 		};
  // 	}
  // 	const selectedRelationsWithoutPK:
  // 	// Process all relations without primary keys, because they need to be joined differently and will all be on the same query level
  // 	for (
  // 		const {
  // 			tsKey: selectedRelationTsKey,
  // 			queryConfig: selectedRelationConfigValue,
  // 			relation,
  // 		} of initiallySelectedRelations
  // 	) {
  // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
  // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
  // 		const relationTableTsName = tableNamesMap[relationTableName]!;
  // 		const relationTable = schema[relationTableTsName]!;
  // 		if (relationTable.primaryKey.length > 0) {
  // 			continue;
  // 		}
  // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
  // 		const joinOn = and(
  // 			...normalizedRelation.fields.map((field, i) =>
  // 				eq(
  // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
  // 					aliasedTableColumn(field, tableAlias),
  // 				)
  // 			),
  // 		);
  // 		const builtRelation = this.buildRelationalQueryWithoutPK({
  // 			fullSchema,
  // 			schema,
  // 			tableNamesMap,
  // 			table: fullSchema[relationTableTsName] as PgTable,
  // 			tableConfig: schema[relationTableTsName]!,
  // 			queryConfig: selectedRelationConfigValue,
  // 			tableAlias: relationTableAlias,
  // 			joinOn,
  // 			nestedQueryRelation: relation,
  // 		});
  // 		const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier('data')}`.as(selectedRelationTsKey);
  // 		joins.push({
  // 			on: sql`true`,
  // 			table: new Subquery(builtRelation.sql as SQL, {}, relationTableAlias),
  // 			alias: relationTableAlias,
  // 			joinType: 'left',
  // 			lateral: true,
  // 		});
  // 		selectedRelations.push({
  // 			dbKey: selectedRelationTsKey,
  // 			tsKey: selectedRelationTsKey,
  // 			field,
  // 			relationTableTsKey: relationTableTsName,
  // 			isJson: true,
  // 			selection: builtRelation.selection,
  // 		});
  // 	}
  // 	const oneRelations = initiallySelectedRelations.filter((r): r is typeof r & { relation: One } =>
  // 		is(r.relation, One)
  // 	);
  // 	// Process all One relations with PKs, because they can all be joined on the same level
  // 	for (
  // 		const {
  // 			tsKey: selectedRelationTsKey,
  // 			queryConfig: selectedRelationConfigValue,
  // 			relation,
  // 		} of oneRelations
  // 	) {
  // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
  // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
  // 		const relationTableTsName = tableNamesMap[relationTableName]!;
  // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
  // 		const relationTable = schema[relationTableTsName]!;
  // 		if (relationTable.primaryKey.length === 0) {
  // 			continue;
  // 		}
  // 		const joinOn = and(
  // 			...normalizedRelation.fields.map((field, i) =>
  // 				eq(
  // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
  // 					aliasedTableColumn(field, tableAlias),
  // 				)
  // 			),
  // 		);
  // 		const builtRelation = this.buildRelationalQueryWithPK({
  // 			fullSchema,
  // 			schema,
  // 			tableNamesMap,
  // 			table: fullSchema[relationTableTsName] as PgTable,
  // 			tableConfig: schema[relationTableTsName]!,
  // 			queryConfig: selectedRelationConfigValue,
  // 			tableAlias: relationTableAlias,
  // 			joinOn,
  // 		});
  // 		const field = sql`case when ${sql.identifier(relationTableAlias)} is null then null else json_build_array(${
  // 			sql.join(
  // 				builtRelation.selection.map(({ field }) =>
  // 					is(field, SQL.Aliased)
  // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
  // 						: is(field, Column)
  // 						? aliasedTableColumn(field, relationTableAlias)
  // 						: field
  // 				),
  // 				sql`, `,
  // 			)
  // 		}) end`.as(selectedRelationTsKey);
  // 		const isLateralJoin = is(builtRelation.sql, SQL);
  // 		joins.push({
  // 			on: isLateralJoin ? sql`true` : joinOn,
  // 			table: is(builtRelation.sql, SQL)
  // 				? new Subquery(builtRelation.sql, {}, relationTableAlias)
  // 				: aliasedTable(builtRelation.sql, relationTableAlias),
  // 			alias: relationTableAlias,
  // 			joinType: 'left',
  // 			lateral: is(builtRelation.sql, SQL),
  // 		});
  // 		selectedRelations.push({
  // 			dbKey: selectedRelationTsKey,
  // 			tsKey: selectedRelationTsKey,
  // 			field,
  // 			relationTableTsKey: relationTableTsName,
  // 			isJson: true,
  // 			selection: builtRelation.selection,
  // 		});
  // 	}
  // 	let distinct: PgSelectConfig['distinct'];
  // 	let tableFrom: PgTable | Subquery = table;
  // 	// Process first Many relation - each one requires a nested subquery
  // 	const manyRelation = manyRelations[0];
  // 	if (manyRelation) {
  // 		const {
  // 			tsKey: selectedRelationTsKey,
  // 			queryConfig: selectedRelationQueryConfig,
  // 			relation,
  // 		} = manyRelation;
  // 		distinct = {
  // 			on: tableConfig.primaryKey.map((c) => aliasedTableColumn(c as PgColumn, tableAlias)),
  // 		};
  // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
  // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
  // 		const relationTableTsName = tableNamesMap[relationTableName]!;
  // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
  // 		const joinOn = and(
  // 			...normalizedRelation.fields.map((field, i) =>
  // 				eq(
  // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
  // 					aliasedTableColumn(field, tableAlias),
  // 				)
  // 			),
  // 		);
  // 		const builtRelationJoin = this.buildRelationalQueryWithPK({
  // 			fullSchema,
  // 			schema,
  // 			tableNamesMap,
  // 			table: fullSchema[relationTableTsName] as PgTable,
  // 			tableConfig: schema[relationTableTsName]!,
  // 			queryConfig: selectedRelationQueryConfig,
  // 			tableAlias: relationTableAlias,
  // 			joinOn,
  // 		});
  // 		const builtRelationSelectionField = sql`case when ${
  // 			sql.identifier(relationTableAlias)
  // 		} is null then '[]' else json_agg(json_build_array(${
  // 			sql.join(
  // 				builtRelationJoin.selection.map(({ field }) =>
  // 					is(field, SQL.Aliased)
  // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
  // 						: is(field, Column)
  // 						? aliasedTableColumn(field, relationTableAlias)
  // 						: field
  // 				),
  // 				sql`, `,
  // 			)
  // 		})) over (partition by ${sql.join(distinct.on, sql`, `)}) end`.as(selectedRelationTsKey);
  // 		const isLateralJoin = is(builtRelationJoin.sql, SQL);
  // 		joins.push({
  // 			on: isLateralJoin ? sql`true` : joinOn,
  // 			table: isLateralJoin
  // 				? new Subquery(builtRelationJoin.sql as SQL, {}, relationTableAlias)
  // 				: aliasedTable(builtRelationJoin.sql as PgTable, relationTableAlias),
  // 			alias: relationTableAlias,
  // 			joinType: 'left',
  // 			lateral: isLateralJoin,
  // 		});
  // 		// Build the "from" subquery with the remaining Many relations
  // 		const builtTableFrom = this.buildRelationalQueryWithPK({
  // 			fullSchema,
  // 			schema,
  // 			tableNamesMap,
  // 			table,
  // 			tableConfig,
  // 			queryConfig: {
  // 				...config,
  // 				where: undefined,
  // 				orderBy: undefined,
  // 				limit: undefined,
  // 				offset: undefined,
  // 				with: manyRelations.slice(1).reduce<NonNullable<typeof config['with']>>(
  // 					(result, { tsKey, queryConfig: configValue }) => {
  // 						result[tsKey] = configValue;
  // 						return result;
  // 					},
  // 					{},
  // 				),
  // 			},
  // 			tableAlias,
  // 		});
  // 		selectedRelations.push({
  // 			dbKey: selectedRelationTsKey,
  // 			tsKey: selectedRelationTsKey,
  // 			field: builtRelationSelectionField,
  // 			relationTableTsKey: relationTableTsName,
  // 			isJson: true,
  // 			selection: builtRelationJoin.selection,
  // 		});
  // 		// selection = builtTableFrom.selection.map((item) =>
  // 		// 	is(item.field, SQL.Aliased)
  // 		// 		? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
  // 		// 		: item
  // 		// );
  // 		// selectionForBuild = [{
  // 		// 	dbKey: '*',
  // 		// 	tsKey: '*',
  // 		// 	field: sql`${sql.identifier(tableAlias)}.*`,
  // 		// 	selection: [],
  // 		// 	isJson: false,
  // 		// 	relationTableTsKey: undefined,
  // 		// }];
  // 		// const newSelectionItem: (typeof selection)[number] = {
  // 		// 	dbKey: selectedRelationTsKey,
  // 		// 	tsKey: selectedRelationTsKey,
  // 		// 	field,
  // 		// 	relationTableTsKey: relationTableTsName,
  // 		// 	isJson: true,
  // 		// 	selection: builtRelationJoin.selection,
  // 		// };
  // 		// selection.push(newSelectionItem);
  // 		// selectionForBuild.push(newSelectionItem);
  // 		tableFrom = is(builtTableFrom.sql, PgTable)
  // 			? builtTableFrom.sql
  // 			: new Subquery(builtTableFrom.sql, {}, tableAlias);
  // 	}
  // 	if (selectedColumns.length === 0 && selectedRelations.length === 0 && selectedExtras.length === 0) {
  // 		throw new DrizzleError(`No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")`);
  // 	}
  // 	let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'];
  // 	function prepareSelectedColumns() {
  // 		return selectedColumns.map((key) => ({
  // 			dbKey: tableConfig.columns[key]!.name,
  // 			tsKey: key,
  // 			field: tableConfig.columns[key] as PgColumn,
  // 			relationTableTsKey: undefined,
  // 			isJson: false,
  // 			selection: [],
  // 		}));
  // 	}
  // 	function prepareSelectedExtras() {
  // 		return selectedExtras.map((item) => ({
  // 			dbKey: item.value.fieldAlias,
  // 			tsKey: item.tsKey,
  // 			field: item.value,
  // 			relationTableTsKey: undefined,
  // 			isJson: false,
  // 			selection: [],
  // 		}));
  // 	}
  // 	if (isRoot) {
  // 		selection = [
  // 			...prepareSelectedColumns(),
  // 			...prepareSelectedExtras(),
  // 		];
  // 	}
  // 	if (hasUserDefinedWhere || orderBy.length > 0) {
  // 		tableFrom = new Subquery(
  // 			this.buildSelectQuery({
  // 				table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
  // 				fields: {},
  // 				fieldsFlat: selectionForBuild.map(({ field }) => ({
  // 					path: [],
  // 					field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
  // 				})),
  // 				joins,
  // 				distinct,
  // 			}),
  // 			{},
  // 			tableAlias,
  // 		);
  // 		selectionForBuild = selection.map((item) =>
  // 			is(item.field, SQL.Aliased)
  // 				? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
  // 				: item
  // 		);
  // 		joins = [];
  // 		distinct = undefined;
  // 	}
  // 	const result = this.buildSelectQuery({
  // 		table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
  // 		fields: {},
  // 		fieldsFlat: selectionForBuild.map(({ field }) => ({
  // 			path: [],
  // 			field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
  // 		})),
  // 		where,
  // 		limit,
  // 		offset,
  // 		joins,
  // 		orderBy,
  // 		distinct,
  // 	});
  // 	return {
  // 		tableTsKey: tableConfig.tsName,
  // 		sql: result,
  // 		selection,
  // 	};
  // }
  buildRelationalQueryWithoutPK({
    fullSchema,
    schema,
    tableNamesMap,
    table,
    tableConfig,
    queryConfig: config,
    tableAlias,
    nestedQueryRelation,
    joinOn
  }) {
    let selection = [];
    let limit, offset, orderBy = [], where;
    const joins = [];
    if (config === true) {
      const selectionEntries = Object.entries(tableConfig.columns);
      selection = selectionEntries.map(([key, value]) => ({
        dbKey: value.name,
        tsKey: key,
        field: aliasedTableColumn(value, tableAlias),
        relationTableTsKey: void 0,
        isJson: false,
        selection: []
      }));
    } else {
      const aliasedColumns = Object.fromEntries(
        Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)])
      );
      if (config.where) {
        const whereSql = typeof config.where === "function" ? config.where(aliasedColumns, getOperators()) : config.where;
        where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
      }
      const fieldsSelection = [];
      let selectedColumns = [];
      if (config.columns) {
        let isIncludeMode = false;
        for (const [field, value] of Object.entries(config.columns)) {
          if (value === void 0) {
            continue;
          }
          if (field in tableConfig.columns) {
            if (!isIncludeMode && value === true) {
              isIncludeMode = true;
            }
            selectedColumns.push(field);
          }
        }
        if (selectedColumns.length > 0) {
          selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
        }
      } else {
        selectedColumns = Object.keys(tableConfig.columns);
      }
      for (const field of selectedColumns) {
        const column = tableConfig.columns[field];
        fieldsSelection.push({ tsKey: field, value: column });
      }
      let selectedRelations = [];
      if (config.with) {
        selectedRelations = Object.entries(config.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey] }));
      }
      let extras;
      if (config.extras) {
        extras = typeof config.extras === "function" ? config.extras(aliasedColumns, { sql }) : config.extras;
        for (const [tsKey, value] of Object.entries(extras)) {
          fieldsSelection.push({
            tsKey,
            value: mapColumnsInAliasedSQLToAlias(value, tableAlias)
          });
        }
      }
      for (const { tsKey, value } of fieldsSelection) {
        selection.push({
          dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
          tsKey,
          field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
          relationTableTsKey: void 0,
          isJson: false,
          selection: []
        });
      }
      let orderByOrig = typeof config.orderBy === "function" ? config.orderBy(aliasedColumns, getOrderByOperators()) : config.orderBy ?? [];
      if (!Array.isArray(orderByOrig)) {
        orderByOrig = [orderByOrig];
      }
      orderBy = orderByOrig.map((orderByValue) => {
        if (is(orderByValue, Column)) {
          return aliasedTableColumn(orderByValue, tableAlias);
        }
        return mapColumnsInSQLToAlias(orderByValue, tableAlias);
      });
      limit = config.limit;
      offset = config.offset;
      for (const {
        tsKey: selectedRelationTsKey,
        queryConfig: selectedRelationConfigValue,
        relation
      } of selectedRelations) {
        const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
        const relationTableName = getTableUniqueName(relation.referencedTable);
        const relationTableTsName = tableNamesMap[relationTableName];
        const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
        const joinOn2 = and(
          ...normalizedRelation.fields.map(
            (field2, i) => eq(
              aliasedTableColumn(normalizedRelation.references[i], relationTableAlias),
              aliasedTableColumn(field2, tableAlias)
            )
          )
        );
        const builtRelation = this.buildRelationalQueryWithoutPK({
          fullSchema,
          schema,
          tableNamesMap,
          table: fullSchema[relationTableTsName],
          tableConfig: schema[relationTableTsName],
          queryConfig: is(relation, One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
          tableAlias: relationTableAlias,
          joinOn: joinOn2,
          nestedQueryRelation: relation
        });
        const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier("data")}`.as(selectedRelationTsKey);
        joins.push({
          on: sql`true`,
          table: new Subquery(builtRelation.sql, {}, relationTableAlias),
          alias: relationTableAlias,
          joinType: "left",
          lateral: true
        });
        selection.push({
          dbKey: selectedRelationTsKey,
          tsKey: selectedRelationTsKey,
          field,
          relationTableTsKey: relationTableTsName,
          isJson: true,
          selection: builtRelation.selection
        });
      }
    }
    if (selection.length === 0) {
      throw new DrizzleError({ message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")` });
    }
    let result;
    where = and(joinOn, where);
    if (nestedQueryRelation) {
      let field = sql`json_build_array(${sql.join(
        selection.map(
          ({ field: field2, tsKey, isJson }) => isJson ? sql`${sql.identifier(`${tableAlias}_${tsKey}`)}.${sql.identifier("data")}` : is(field2, SQL.Aliased) ? field2.sql : field2
        ),
        sql`, `
      )})`;
      if (is(nestedQueryRelation, Many)) {
        field = sql`coalesce(json_agg(${field}${orderBy.length > 0 ? sql` order by ${sql.join(orderBy, sql`, `)}` : void 0}), '[]'::json)`;
      }
      const nestedSelection = [{
        dbKey: "data",
        tsKey: "data",
        field: field.as("data"),
        isJson: true,
        relationTableTsKey: tableConfig.tsName,
        selection
      }];
      const needsSubquery = limit !== void 0 || offset !== void 0 || orderBy.length > 0;
      if (needsSubquery) {
        result = this.buildSelectQuery({
          table: aliasedTable(table, tableAlias),
          fields: {},
          fieldsFlat: [{
            path: [],
            field: sql.raw("*")
          }],
          where,
          limit,
          offset,
          orderBy,
          setOperators: []
        });
        where = void 0;
        limit = void 0;
        offset = void 0;
        orderBy = [];
      } else {
        result = aliasedTable(table, tableAlias);
      }
      result = this.buildSelectQuery({
        table: is(result, PgTable) ? result : new Subquery(result, {}, tableAlias),
        fields: {},
        fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
          path: [],
          field: is(field2, Column) ? aliasedTableColumn(field2, tableAlias) : field2
        })),
        joins,
        where,
        limit,
        offset,
        orderBy,
        setOperators: []
      });
    } else {
      result = this.buildSelectQuery({
        table: aliasedTable(table, tableAlias),
        fields: {},
        fieldsFlat: selection.map(({ field }) => ({
          path: [],
          field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field
        })),
        joins,
        where,
        limit,
        offset,
        orderBy,
        setOperators: []
      });
    }
    return {
      tableTsKey: tableConfig.tsName,
      sql: result,
      selection
    };
  }
};

// node_modules/drizzle-orm/query-builders/query-builder.js
var TypedQueryBuilder = class {
  static [entityKind] = "TypedQueryBuilder";
  /** @internal */
  getSelectedFields() {
    return this._.selectedFields;
  }
};

// node_modules/drizzle-orm/pg-core/query-builders/select.js
var PgSelectBuilder = class {
  static [entityKind] = "PgSelectBuilder";
  fields;
  session;
  dialect;
  withList = [];
  distinct;
  constructor(config) {
    this.fields = config.fields;
    this.session = config.session;
    this.dialect = config.dialect;
    if (config.withList) {
      this.withList = config.withList;
    }
    this.distinct = config.distinct;
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  /**
   * Specify the table, subquery, or other target that you're
   * building a select query against.
   *
   * {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FROM | Postgres from documentation}
   */
  from(source) {
    const isPartialSelect = !!this.fields;
    const src = source;
    let fields;
    if (this.fields) {
      fields = this.fields;
    } else if (is(src, Subquery)) {
      fields = Object.fromEntries(
        Object.keys(src._.selectedFields).map((key) => [key, src[key]])
      );
    } else if (is(src, PgViewBase)) {
      fields = src[ViewBaseConfig].selectedFields;
    } else if (is(src, SQL)) {
      fields = {};
    } else {
      fields = getTableColumns(src);
    }
    return new PgSelectBase({
      table: src,
      fields,
      isPartialSelect,
      session: this.session,
      dialect: this.dialect,
      withList: this.withList,
      distinct: this.distinct
    }).setToken(this.authToken);
  }
};
var PgSelectQueryBuilderBase = class extends TypedQueryBuilder {
  static [entityKind] = "PgSelectQueryBuilder";
  _;
  config;
  joinsNotNullableMap;
  tableName;
  isPartialSelect;
  session;
  dialect;
  cacheConfig = void 0;
  usedTables = /* @__PURE__ */ new Set();
  constructor({ table, fields, isPartialSelect, session, dialect, withList, distinct }) {
    super();
    this.config = {
      withList,
      table,
      fields: { ...fields },
      distinct,
      setOperators: []
    };
    this.isPartialSelect = isPartialSelect;
    this.session = session;
    this.dialect = dialect;
    this._ = {
      selectedFields: fields,
      config: this.config
    };
    this.tableName = getTableLikeName(table);
    this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
    for (const item of extractUsedTable(table)) this.usedTables.add(item);
  }
  /** @internal */
  getUsedTables() {
    return [...this.usedTables];
  }
  createJoin(joinType, lateral) {
    return (table, on) => {
      const baseTableName = this.tableName;
      const tableName = getTableLikeName(table);
      for (const item of extractUsedTable(table)) this.usedTables.add(item);
      if (typeof tableName === "string" && this.config.joins?.some((join) => join.alias === tableName)) {
        throw new Error(`Alias "${tableName}" is already used in this query`);
      }
      if (!this.isPartialSelect) {
        if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
          this.config.fields = {
            [baseTableName]: this.config.fields
          };
        }
        if (typeof tableName === "string" && !is(table, SQL)) {
          const selection = is(table, Subquery) ? table._.selectedFields : is(table, View) ? table[ViewBaseConfig].selectedFields : table[Table.Symbol.Columns];
          this.config.fields[tableName] = selection;
        }
      }
      if (typeof on === "function") {
        on = on(
          new Proxy(
            this.config.fields,
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          )
        );
      }
      if (!this.config.joins) {
        this.config.joins = [];
      }
      this.config.joins.push({ on, table, joinType, alias: tableName, lateral });
      if (typeof tableName === "string") {
        switch (joinType) {
          case "left": {
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
          case "right": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "cross":
          case "inner": {
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "full": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
        }
      }
      return this;
    };
  }
  /**
   * Executes a `left join` operation by adding another table to the current query.
   *
   * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#left-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User; pets: Pet | null; }[] = await db.select()
   *   .from(users)
   *   .leftJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number; petId: number | null; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .leftJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  leftJoin = this.createJoin("left", false);
  /**
   * Executes a `left join lateral` operation by adding subquery to the current query.
   *
   * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
   *
   * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#left-join-lateral}
   *
   * @param table the subquery to join.
   * @param on the `on` clause.
   */
  leftJoinLateral = this.createJoin("left", true);
  /**
   * Executes a `right join` operation by adding another table to the current query.
   *
   * Calling this method associates each row of the joined table with the corresponding row from the main table, if a match is found. If no matching row exists, it sets all columns of the main table to null.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#right-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User | null; pets: Pet; }[] = await db.select()
   *   .from(users)
   *   .rightJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number | null; petId: number; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .rightJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  rightJoin = this.createJoin("right", false);
  /**
   * Executes an `inner join` operation, creating a new table by combining rows from two tables that have matching values.
   *
   * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
   *   .from(users)
   *   .innerJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .innerJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  innerJoin = this.createJoin("inner", false);
  /**
   * Executes an `inner join lateral` operation, creating a new table by combining rows from two queries that have matching values.
   *
   * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
   *
   * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join-lateral}
   *
   * @param table the subquery to join.
   * @param on the `on` clause.
   */
  innerJoinLateral = this.createJoin("inner", true);
  /**
   * Executes a `full join` operation by combining rows from two tables into a new table.
   *
   * Calling this method retrieves all rows from both main and joined tables, merging rows with matching values and filling in `null` for non-matching columns.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#full-join}
   *
   * @param table the table to join.
   * @param on the `on` clause.
   *
   * @example
   *
   * ```ts
   * // Select all users and their pets
   * const usersWithPets: { user: User | null; pets: Pet | null; }[] = await db.select()
   *   .from(users)
   *   .fullJoin(pets, eq(users.id, pets.ownerId))
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number | null; petId: number | null; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .fullJoin(pets, eq(users.id, pets.ownerId))
   * ```
   */
  fullJoin = this.createJoin("full", false);
  /**
   * Executes a `cross join` operation by combining rows from two tables into a new table.
   *
   * Calling this method retrieves all rows from both main and joined tables, merging all rows from each table.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join}
   *
   * @param table the table to join.
   *
   * @example
   *
   * ```ts
   * // Select all users, each user with every pet
   * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
   *   .from(users)
   *   .crossJoin(pets)
   *
   * // Select userId and petId
   * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
   *   userId: users.id,
   *   petId: pets.id,
   * })
   *   .from(users)
   *   .crossJoin(pets)
   * ```
   */
  crossJoin = this.createJoin("cross", false);
  /**
   * Executes a `cross join lateral` operation by combining rows from two queries into a new table.
   *
   * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
   *
   * Calling this method retrieves all rows from both main and joined queries, merging all rows from each query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join-lateral}
   *
   * @param table the query to join.
   */
  crossJoinLateral = this.createJoin("cross", true);
  createSetOperator(type, isAll) {
    return (rightSelection) => {
      const rightSelect = typeof rightSelection === "function" ? rightSelection(getPgSetOperators()) : rightSelection;
      if (!haveSameKeys(this.getSelectedFields(), rightSelect.getSelectedFields())) {
        throw new Error(
          "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
        );
      }
      this.config.setOperators.push({ type, isAll, rightSelect });
      return this;
    };
  }
  /**
   * Adds `union` set operator to the query.
   *
   * Calling this method will combine the result sets of the `select` statements and remove any duplicate rows that appear across them.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#union}
   *
   * @example
   *
   * ```ts
   * // Select all unique names from customers and users tables
   * await db.select({ name: users.name })
   *   .from(users)
   *   .union(
   *     db.select({ name: customers.name }).from(customers)
   *   );
   * // or
   * import { union } from 'drizzle-orm/pg-core'
   *
   * await union(
   *   db.select({ name: users.name }).from(users),
   *   db.select({ name: customers.name }).from(customers)
   * );
   * ```
   */
  union = this.createSetOperator("union", false);
  /**
   * Adds `union all` set operator to the query.
   *
   * Calling this method will combine the result-set of the `select` statements and keep all duplicate rows that appear across them.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#union-all}
   *
   * @example
   *
   * ```ts
   * // Select all transaction ids from both online and in-store sales
   * await db.select({ transaction: onlineSales.transactionId })
   *   .from(onlineSales)
   *   .unionAll(
   *     db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
   *   );
   * // or
   * import { unionAll } from 'drizzle-orm/pg-core'
   *
   * await unionAll(
   *   db.select({ transaction: onlineSales.transactionId }).from(onlineSales),
   *   db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
   * );
   * ```
   */
  unionAll = this.createSetOperator("union", true);
  /**
   * Adds `intersect` set operator to the query.
   *
   * Calling this method will retain only the rows that are present in both result sets and eliminate duplicates.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect}
   *
   * @example
   *
   * ```ts
   * // Select course names that are offered in both departments A and B
   * await db.select({ courseName: depA.courseName })
   *   .from(depA)
   *   .intersect(
   *     db.select({ courseName: depB.courseName }).from(depB)
   *   );
   * // or
   * import { intersect } from 'drizzle-orm/pg-core'
   *
   * await intersect(
   *   db.select({ courseName: depA.courseName }).from(depA),
   *   db.select({ courseName: depB.courseName }).from(depB)
   * );
   * ```
   */
  intersect = this.createSetOperator("intersect", false);
  /**
   * Adds `intersect all` set operator to the query.
   *
   * Calling this method will retain only the rows that are present in both result sets including all duplicates.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect-all}
   *
   * @example
   *
   * ```ts
   * // Select all products and quantities that are ordered by both regular and VIP customers
   * await db.select({
   *   productId: regularCustomerOrders.productId,
   *   quantityOrdered: regularCustomerOrders.quantityOrdered
   * })
   * .from(regularCustomerOrders)
   * .intersectAll(
   *   db.select({
   *     productId: vipCustomerOrders.productId,
   *     quantityOrdered: vipCustomerOrders.quantityOrdered
   *   })
   *   .from(vipCustomerOrders)
   * );
   * // or
   * import { intersectAll } from 'drizzle-orm/pg-core'
   *
   * await intersectAll(
   *   db.select({
   *     productId: regularCustomerOrders.productId,
   *     quantityOrdered: regularCustomerOrders.quantityOrdered
   *   })
   *   .from(regularCustomerOrders),
   *   db.select({
   *     productId: vipCustomerOrders.productId,
   *     quantityOrdered: vipCustomerOrders.quantityOrdered
   *   })
   *   .from(vipCustomerOrders)
   * );
   * ```
   */
  intersectAll = this.createSetOperator("intersect", true);
  /**
   * Adds `except` set operator to the query.
   *
   * Calling this method will retrieve all unique rows from the left query, except for the rows that are present in the result set of the right query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#except}
   *
   * @example
   *
   * ```ts
   * // Select all courses offered in department A but not in department B
   * await db.select({ courseName: depA.courseName })
   *   .from(depA)
   *   .except(
   *     db.select({ courseName: depB.courseName }).from(depB)
   *   );
   * // or
   * import { except } from 'drizzle-orm/pg-core'
   *
   * await except(
   *   db.select({ courseName: depA.courseName }).from(depA),
   *   db.select({ courseName: depB.courseName }).from(depB)
   * );
   * ```
   */
  except = this.createSetOperator("except", false);
  /**
   * Adds `except all` set operator to the query.
   *
   * Calling this method will retrieve all rows from the left query, except for the rows that are present in the result set of the right query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/set-operations#except-all}
   *
   * @example
   *
   * ```ts
   * // Select all products that are ordered by regular customers but not by VIP customers
   * await db.select({
   *   productId: regularCustomerOrders.productId,
   *   quantityOrdered: regularCustomerOrders.quantityOrdered,
   * })
   * .from(regularCustomerOrders)
   * .exceptAll(
   *   db.select({
   *     productId: vipCustomerOrders.productId,
   *     quantityOrdered: vipCustomerOrders.quantityOrdered,
   *   })
   *   .from(vipCustomerOrders)
   * );
   * // or
   * import { exceptAll } from 'drizzle-orm/pg-core'
   *
   * await exceptAll(
   *   db.select({
   *     productId: regularCustomerOrders.productId,
   *     quantityOrdered: regularCustomerOrders.quantityOrdered
   *   })
   *   .from(regularCustomerOrders),
   *   db.select({
   *     productId: vipCustomerOrders.productId,
   *     quantityOrdered: vipCustomerOrders.quantityOrdered
   *   })
   *   .from(vipCustomerOrders)
   * );
   * ```
   */
  exceptAll = this.createSetOperator("except", true);
  /** @internal */
  addSetOperators(setOperators) {
    this.config.setOperators.push(...setOperators);
    return this;
  }
  /**
   * Adds a `where` clause to the query.
   *
   * Calling this method will select only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#filtering}
   *
   * @param where the `where` clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be selected.
   *
   * ```ts
   * // Select all cars with green color
   * await db.select().from(cars).where(eq(cars.color, 'green'));
   * // or
   * await db.select().from(cars).where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Select all BMW cars with a green color
   * await db.select().from(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Select all cars with the green or blue color
   * await db.select().from(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    if (typeof where === "function") {
      where = where(
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
        )
      );
    }
    this.config.where = where;
    return this;
  }
  /**
   * Adds a `having` clause to the query.
   *
   * Calling this method will select only those rows that fulfill a specified condition. It is typically used with aggregate functions to filter the aggregated data based on a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#aggregations}
   *
   * @param having the `having` clause.
   *
   * @example
   *
   * ```ts
   * // Select all brands with more than one car
   * await db.select({
   * 	brand: cars.brand,
   * 	count: sql<number>`cast(count(${cars.id}) as int)`,
   * })
   *   .from(cars)
   *   .groupBy(cars.brand)
   *   .having(({ count }) => gt(count, 1));
   * ```
   */
  having(having) {
    if (typeof having === "function") {
      having = having(
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
        )
      );
    }
    this.config.having = having;
    return this;
  }
  groupBy(...columns) {
    if (typeof columns[0] === "function") {
      const groupBy = columns[0](
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
        )
      );
      this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
    } else {
      this.config.groupBy = columns;
    }
    return this;
  }
  orderBy(...columns) {
    if (typeof columns[0] === "function") {
      const orderBy = columns[0](
        new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
        )
      );
      const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).orderBy = orderByArray;
      } else {
        this.config.orderBy = orderByArray;
      }
    } else {
      const orderByArray = columns;
      if (this.config.setOperators.length > 0) {
        this.config.setOperators.at(-1).orderBy = orderByArray;
      } else {
        this.config.orderBy = orderByArray;
      }
    }
    return this;
  }
  /**
   * Adds a `limit` clause to the query.
   *
   * Calling this method will set the maximum number of rows that will be returned by this query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
   *
   * @param limit the `limit` clause.
   *
   * @example
   *
   * ```ts
   * // Get the first 10 people from this query.
   * await db.select().from(people).limit(10);
   * ```
   */
  limit(limit) {
    if (this.config.setOperators.length > 0) {
      this.config.setOperators.at(-1).limit = limit;
    } else {
      this.config.limit = limit;
    }
    return this;
  }
  /**
   * Adds an `offset` clause to the query.
   *
   * Calling this method will skip a number of rows when returning results from this query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
   *
   * @param offset the `offset` clause.
   *
   * @example
   *
   * ```ts
   * // Get the 10th-20th people from this query.
   * await db.select().from(people).offset(10).limit(10);
   * ```
   */
  offset(offset) {
    if (this.config.setOperators.length > 0) {
      this.config.setOperators.at(-1).offset = offset;
    } else {
      this.config.offset = offset;
    }
    return this;
  }
  /**
   * Adds a `for` clause to the query.
   *
   * Calling this method will specify a lock strength for this query that controls how strictly it acquires exclusive access to the rows being queried.
   *
   * See docs: {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE}
   *
   * @param strength the lock strength.
   * @param config the lock configuration.
   */
  for(strength, config = {}) {
    this.config.lockingClause = { strength, config };
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildSelectQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  as(alias) {
    const usedTables = [];
    usedTables.push(...extractUsedTable(this.config.table));
    if (this.config.joins) {
      for (const it of this.config.joins) usedTables.push(...extractUsedTable(it.table));
    }
    return new Proxy(
      new Subquery(this.getSQL(), this.config.fields, alias, false, [...new Set(usedTables)]),
      new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
    );
  }
  /** @internal */
  getSelectedFields() {
    return new Proxy(
      this.config.fields,
      new SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
    );
  }
  $dynamic() {
    return this;
  }
  $withCache(config) {
    this.cacheConfig = config === void 0 ? { config: {}, enable: true, autoInvalidate: true } : config === false ? { enable: false } : { enable: true, autoInvalidate: true, ...config };
    return this;
  }
};
var PgSelectBase = class extends PgSelectQueryBuilderBase {
  static [entityKind] = "PgSelect";
  /** @internal */
  _prepare(name) {
    const { session, config, dialect, joinsNotNullableMap, authToken, cacheConfig, usedTables } = this;
    if (!session) {
      throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
    }
    const { fields } = config;
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      const fieldsList = orderSelectedFields(fields);
      const query = session.prepareQuery(dialect.sqlToQuery(this.getSQL()), fieldsList, name, true, void 0, {
        type: "select",
        tables: [...usedTables]
      }, cacheConfig);
      query.joinsNotNullableMap = joinsNotNullableMap;
      return query.setToken(authToken);
    });
  }
  /**
   * Create a prepared statement for this query. This allows
   * the database to remember this query for the given session
   * and call it by name, rather than specifying the full query.
   *
   * {@link https://www.postgresql.org/docs/current/sql-prepare.html | Postgres prepare documentation}
   */
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = (placeholderValues) => {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(placeholderValues, this.authToken);
    });
  };
};
applyMixins(PgSelectBase, [QueryPromise]);
function createSetOperator(type, isAll) {
  return (leftSelect, rightSelect, ...restSelects) => {
    const setOperators = [rightSelect, ...restSelects].map((select) => ({
      type,
      isAll,
      rightSelect: select
    }));
    for (const setOperator of setOperators) {
      if (!haveSameKeys(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
        throw new Error(
          "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
        );
      }
    }
    return leftSelect.addSetOperators(setOperators);
  };
}
var getPgSetOperators = () => ({
  union,
  unionAll,
  intersect,
  intersectAll,
  except,
  exceptAll
});
var union = createSetOperator("union", false);
var unionAll = createSetOperator("union", true);
var intersect = createSetOperator("intersect", false);
var intersectAll = createSetOperator("intersect", true);
var except = createSetOperator("except", false);
var exceptAll = createSetOperator("except", true);

// node_modules/drizzle-orm/pg-core/query-builders/query-builder.js
var QueryBuilder = class {
  static [entityKind] = "PgQueryBuilder";
  dialect;
  dialectConfig;
  constructor(dialect) {
    this.dialect = is(dialect, PgDialect) ? dialect : void 0;
    this.dialectConfig = is(dialect, PgDialect) ? void 0 : dialect;
  }
  $with = (alias, selection) => {
    const queryBuilder = this;
    const as = (qb) => {
      if (typeof qb === "function") {
        qb = qb(queryBuilder);
      }
      return new Proxy(
        new WithSubquery(
          qb.getSQL(),
          selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
          alias,
          true
        ),
        new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
      );
    };
    return { as };
  };
  with(...queries) {
    const self = this;
    function select(fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: void 0,
        dialect: self.getDialect(),
        withList: queries
      });
    }
    function selectDistinct(fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: void 0,
        dialect: self.getDialect(),
        distinct: true
      });
    }
    function selectDistinctOn(on, fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: void 0,
        dialect: self.getDialect(),
        distinct: { on }
      });
    }
    return { select, selectDistinct, selectDistinctOn };
  }
  select(fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: void 0,
      dialect: this.getDialect()
    });
  }
  selectDistinct(fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: void 0,
      dialect: this.getDialect(),
      distinct: true
    });
  }
  selectDistinctOn(on, fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: void 0,
      dialect: this.getDialect(),
      distinct: { on }
    });
  }
  // Lazy load dialect to avoid circular dependency
  getDialect() {
    if (!this.dialect) {
      this.dialect = new PgDialect(this.dialectConfig);
    }
    return this.dialect;
  }
};

// node_modules/drizzle-orm/pg-core/utils.js
function extractUsedTable(table) {
  if (is(table, PgTable)) {
    return [table[Schema] ? `${table[Schema]}.${table[Table.Symbol.BaseName]}` : table[Table.Symbol.BaseName]];
  }
  if (is(table, Subquery)) {
    return table._.usedTables ?? [];
  }
  if (is(table, SQL)) {
    return table.usedTables ?? [];
  }
  return [];
}

// node_modules/drizzle-orm/pg-core/query-builders/delete.js
var PgDeleteBase = class extends QueryPromise {
  constructor(table, session, dialect, withList) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { table, withList };
  }
  static [entityKind] = "PgDelete";
  config;
  cacheConfig;
  /**
   * Adds a `where` clause to the query.
   *
   * Calling this method will delete only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/delete}
   *
   * @param where the `where` clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be deleted.
   *
   * ```ts
   * // Delete all cars with green color
   * await db.delete(cars).where(eq(cars.color, 'green'));
   * // or
   * await db.delete(cars).where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Delete all BMW cars with a green color
   * await db.delete(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Delete all cars with the green or blue color
   * await db.delete(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    this.config.where = where;
    return this;
  }
  returning(fields = this.config.table[Table.Symbol.Columns]) {
    this.config.returningFields = fields;
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildDeleteQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(name) {
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
        type: "delete",
        tables: extractUsedTable(this.config.table)
      }, this.cacheConfig);
    });
  }
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = (placeholderValues) => {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(placeholderValues, this.authToken);
    });
  };
  /** @internal */
  getSelectedFields() {
    return this.config.returningFields ? new Proxy(
      this.config.returningFields,
      new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })
    ) : void 0;
  }
  $dynamic() {
    return this;
  }
};

// node_modules/drizzle-orm/pg-core/query-builders/insert.js
var PgInsertBuilder = class {
  constructor(table, session, dialect, withList, overridingSystemValue_) {
    this.table = table;
    this.session = session;
    this.dialect = dialect;
    this.withList = withList;
    this.overridingSystemValue_ = overridingSystemValue_;
  }
  static [entityKind] = "PgInsertBuilder";
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  overridingSystemValue() {
    this.overridingSystemValue_ = true;
    return this;
  }
  values(values) {
    values = Array.isArray(values) ? values : [values];
    if (values.length === 0) {
      throw new Error("values() must be called with at least one value");
    }
    const mappedValues = values.map((entry) => {
      const result = {};
      const cols = this.table[Table.Symbol.Columns];
      for (const colKey of Object.keys(entry)) {
        const colValue = entry[colKey];
        result[colKey] = is(colValue, SQL) ? colValue : new Param(colValue, cols[colKey]);
      }
      return result;
    });
    return new PgInsertBase(
      this.table,
      mappedValues,
      this.session,
      this.dialect,
      this.withList,
      false,
      this.overridingSystemValue_
    ).setToken(this.authToken);
  }
  select(selectQuery) {
    const select = typeof selectQuery === "function" ? selectQuery(new QueryBuilder()) : selectQuery;
    if (!is(select, SQL) && !haveSameKeys(this.table[Columns], select._.selectedFields)) {
      throw new Error(
        "Insert select error: selected fields are not the same or are in a different order compared to the table definition"
      );
    }
    return new PgInsertBase(this.table, select, this.session, this.dialect, this.withList, true);
  }
};
var PgInsertBase = class extends QueryPromise {
  constructor(table, values, session, dialect, withList, select, overridingSystemValue_) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { table, values, withList, select, overridingSystemValue_ };
  }
  static [entityKind] = "PgInsert";
  config;
  cacheConfig;
  returning(fields = this.config.table[Table.Symbol.Columns]) {
    this.config.returningFields = fields;
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /**
   * Adds an `on conflict do nothing` clause to the query.
   *
   * Calling this method simply avoids inserting a row as its alternative action.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert#on-conflict-do-nothing}
   *
   * @param config The `target` and `where` clauses.
   *
   * @example
   * ```ts
   * // Insert one row and cancel the insert if there's a conflict
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoNothing();
   *
   * // Explicitly specify conflict target
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoNothing({ target: cars.id });
   * ```
   */
  onConflictDoNothing(config = {}) {
    if (config.target === void 0) {
      this.config.onConflict = sql`do nothing`;
    } else {
      let targetColumn = "";
      targetColumn = Array.isArray(config.target) ? config.target.map((it) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
      const whereSql = config.where ? sql` where ${config.where}` : void 0;
      this.config.onConflict = sql`(${sql.raw(targetColumn)})${whereSql} do nothing`;
    }
    return this;
  }
  /**
   * Adds an `on conflict do update` clause to the query.
   *
   * Calling this method will update the existing row that conflicts with the row proposed for insertion as its alternative action.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert#upserts-and-conflicts}
   *
   * @param config The `target`, `set` and `where` clauses.
   *
   * @example
   * ```ts
   * // Update the row if there's a conflict
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoUpdate({
   *     target: cars.id,
   *     set: { brand: 'Porsche' }
   *   });
   *
   * // Upsert with 'where' clause
   * await db.insert(cars)
   *   .values({ id: 1, brand: 'BMW' })
   *   .onConflictDoUpdate({
   *     target: cars.id,
   *     set: { brand: 'newBMW' },
   *     targetWhere: sql`${cars.createdAt} > '2023-01-01'::date`,
   *   });
   * ```
   */
  onConflictDoUpdate(config) {
    if (config.where && (config.targetWhere || config.setWhere)) {
      throw new Error(
        'You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.'
      );
    }
    const whereSql = config.where ? sql` where ${config.where}` : void 0;
    const targetWhereSql = config.targetWhere ? sql` where ${config.targetWhere}` : void 0;
    const setWhereSql = config.setWhere ? sql` where ${config.setWhere}` : void 0;
    const setSql = this.dialect.buildUpdateSet(this.config.table, mapUpdateSet(this.config.table, config.set));
    let targetColumn = "";
    targetColumn = Array.isArray(config.target) ? config.target.map((it) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
    this.config.onConflict = sql`(${sql.raw(targetColumn)})${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`;
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildInsertQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(name) {
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
        type: "insert",
        tables: extractUsedTable(this.config.table)
      }, this.cacheConfig);
    });
  }
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = (placeholderValues) => {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(placeholderValues, this.authToken);
    });
  };
  /** @internal */
  getSelectedFields() {
    return this.config.returningFields ? new Proxy(
      this.config.returningFields,
      new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })
    ) : void 0;
  }
  $dynamic() {
    return this;
  }
};

// node_modules/drizzle-orm/pg-core/query-builders/refresh-materialized-view.js
var PgRefreshMaterializedView = class extends QueryPromise {
  constructor(view, session, dialect) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { view };
  }
  static [entityKind] = "PgRefreshMaterializedView";
  config;
  concurrently() {
    if (this.config.withNoData !== void 0) {
      throw new Error("Cannot use concurrently and withNoData together");
    }
    this.config.concurrently = true;
    return this;
  }
  withNoData() {
    if (this.config.concurrently !== void 0) {
      throw new Error("Cannot use concurrently and withNoData together");
    }
    this.config.withNoData = true;
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildRefreshMaterializedViewQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(name) {
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), void 0, name, true);
    });
  }
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = (placeholderValues) => {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(placeholderValues, this.authToken);
    });
  };
};

// node_modules/drizzle-orm/pg-core/query-builders/update.js
var PgUpdateBuilder = class {
  constructor(table, session, dialect, withList) {
    this.table = table;
    this.session = session;
    this.dialect = dialect;
    this.withList = withList;
  }
  static [entityKind] = "PgUpdateBuilder";
  authToken;
  setToken(token) {
    this.authToken = token;
    return this;
  }
  set(values) {
    return new PgUpdateBase(
      this.table,
      mapUpdateSet(this.table, values),
      this.session,
      this.dialect,
      this.withList
    ).setToken(this.authToken);
  }
};
var PgUpdateBase = class extends QueryPromise {
  constructor(table, set, session, dialect, withList) {
    super();
    this.session = session;
    this.dialect = dialect;
    this.config = { set, table, withList, joins: [] };
    this.tableName = getTableLikeName(table);
    this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
  }
  static [entityKind] = "PgUpdate";
  config;
  tableName;
  joinsNotNullableMap;
  cacheConfig;
  from(source) {
    const src = source;
    const tableName = getTableLikeName(src);
    if (typeof tableName === "string") {
      this.joinsNotNullableMap[tableName] = true;
    }
    this.config.from = src;
    return this;
  }
  getTableLikeFields(table) {
    if (is(table, PgTable)) {
      return table[Table.Symbol.Columns];
    } else if (is(table, Subquery)) {
      return table._.selectedFields;
    }
    return table[ViewBaseConfig].selectedFields;
  }
  createJoin(joinType) {
    return (table, on) => {
      const tableName = getTableLikeName(table);
      if (typeof tableName === "string" && this.config.joins.some((join) => join.alias === tableName)) {
        throw new Error(`Alias "${tableName}" is already used in this query`);
      }
      if (typeof on === "function") {
        const from = this.config.from && !is(this.config.from, SQL) ? this.getTableLikeFields(this.config.from) : void 0;
        on = on(
          new Proxy(
            this.config.table[Table.Symbol.Columns],
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          ),
          from && new Proxy(
            from,
            new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
          )
        );
      }
      this.config.joins.push({ on, table, joinType, alias: tableName });
      if (typeof tableName === "string") {
        switch (joinType) {
          case "left": {
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
          case "right": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "inner": {
            this.joinsNotNullableMap[tableName] = true;
            break;
          }
          case "full": {
            this.joinsNotNullableMap = Object.fromEntries(
              Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
            );
            this.joinsNotNullableMap[tableName] = false;
            break;
          }
        }
      }
      return this;
    };
  }
  leftJoin = this.createJoin("left");
  rightJoin = this.createJoin("right");
  innerJoin = this.createJoin("inner");
  fullJoin = this.createJoin("full");
  /**
   * Adds a 'where' clause to the query.
   *
   * Calling this method will update only those rows that fulfill a specified condition.
   *
   * See docs: {@link https://orm.drizzle.team/docs/update}
   *
   * @param where the 'where' clause.
   *
   * @example
   * You can use conditional operators and `sql function` to filter the rows to be updated.
   *
   * ```ts
   * // Update all cars with green color
   * await db.update(cars).set({ color: 'red' })
   *   .where(eq(cars.color, 'green'));
   * // or
   * await db.update(cars).set({ color: 'red' })
   *   .where(sql`${cars.color} = 'green'`)
   * ```
   *
   * You can logically combine conditional operators with `and()` and `or()` operators:
   *
   * ```ts
   * // Update all BMW cars with a green color
   * await db.update(cars).set({ color: 'red' })
   *   .where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
   *
   * // Update all cars with the green or blue color
   * await db.update(cars).set({ color: 'red' })
   *   .where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
   * ```
   */
  where(where) {
    this.config.where = where;
    return this;
  }
  returning(fields) {
    if (!fields) {
      fields = Object.assign({}, this.config.table[Table.Symbol.Columns]);
      if (this.config.from) {
        const tableName = getTableLikeName(this.config.from);
        if (typeof tableName === "string" && this.config.from && !is(this.config.from, SQL)) {
          const fromFields = this.getTableLikeFields(this.config.from);
          fields[tableName] = fromFields;
        }
        for (const join of this.config.joins) {
          const tableName2 = getTableLikeName(join.table);
          if (typeof tableName2 === "string" && !is(join.table, SQL)) {
            const fromFields = this.getTableLikeFields(join.table);
            fields[tableName2] = fromFields;
          }
        }
      }
    }
    this.config.returningFields = fields;
    this.config.returning = orderSelectedFields(fields);
    return this;
  }
  /** @internal */
  getSQL() {
    return this.dialect.buildUpdateQuery(this.config);
  }
  toSQL() {
    const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
    return rest;
  }
  /** @internal */
  _prepare(name) {
    const query = this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
      type: "insert",
      tables: extractUsedTable(this.config.table)
    }, this.cacheConfig);
    query.joinsNotNullableMap = this.joinsNotNullableMap;
    return query;
  }
  prepare(name) {
    return this._prepare(name);
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute = (placeholderValues) => {
    return this._prepare().execute(placeholderValues, this.authToken);
  };
  /** @internal */
  getSelectedFields() {
    return this.config.returningFields ? new Proxy(
      this.config.returningFields,
      new SelectionProxyHandler({
        alias: getTableName(this.config.table),
        sqlAliasedBehavior: "alias",
        sqlBehavior: "error"
      })
    ) : void 0;
  }
  $dynamic() {
    return this;
  }
};

// node_modules/drizzle-orm/pg-core/query-builders/count.js
var PgCountBuilder = class _PgCountBuilder extends SQL {
  constructor(params) {
    super(_PgCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);
    this.params = params;
    this.mapWith(Number);
    this.session = params.session;
    this.sql = _PgCountBuilder.buildCount(
      params.source,
      params.filters
    );
  }
  sql;
  token;
  static [entityKind] = "PgCountBuilder";
  [Symbol.toStringTag] = "PgCountBuilder";
  session;
  static buildEmbeddedCount(source, filters) {
    return sql`(select count(*) from ${source}${sql.raw(" where ").if(filters)}${filters})`;
  }
  static buildCount(source, filters) {
    return sql`select count(*) as count from ${source}${sql.raw(" where ").if(filters)}${filters};`;
  }
  /** @intrnal */
  setToken(token) {
    this.token = token;
    return this;
  }
  then(onfulfilled, onrejected) {
    return Promise.resolve(this.session.count(this.sql, this.token)).then(
      onfulfilled,
      onrejected
    );
  }
  catch(onRejected) {
    return this.then(void 0, onRejected);
  }
  finally(onFinally) {
    return this.then(
      (value) => {
        onFinally?.();
        return value;
      },
      (reason) => {
        onFinally?.();
        throw reason;
      }
    );
  }
};

// node_modules/drizzle-orm/pg-core/query-builders/query.js
var RelationalQueryBuilder = class {
  constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session) {
    this.fullSchema = fullSchema;
    this.schema = schema;
    this.tableNamesMap = tableNamesMap;
    this.table = table;
    this.tableConfig = tableConfig;
    this.dialect = dialect;
    this.session = session;
  }
  static [entityKind] = "PgRelationalQueryBuilder";
  findMany(config) {
    return new PgRelationalQuery(
      this.fullSchema,
      this.schema,
      this.tableNamesMap,
      this.table,
      this.tableConfig,
      this.dialect,
      this.session,
      config ? config : {},
      "many"
    );
  }
  findFirst(config) {
    return new PgRelationalQuery(
      this.fullSchema,
      this.schema,
      this.tableNamesMap,
      this.table,
      this.tableConfig,
      this.dialect,
      this.session,
      config ? { ...config, limit: 1 } : { limit: 1 },
      "first"
    );
  }
};
var PgRelationalQuery = class extends QueryPromise {
  constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session, config, mode) {
    super();
    this.fullSchema = fullSchema;
    this.schema = schema;
    this.tableNamesMap = tableNamesMap;
    this.table = table;
    this.tableConfig = tableConfig;
    this.dialect = dialect;
    this.session = session;
    this.config = config;
    this.mode = mode;
  }
  static [entityKind] = "PgRelationalQuery";
  /** @internal */
  _prepare(name) {
    return tracer.startActiveSpan("drizzle.prepareQuery", () => {
      const { query, builtQuery } = this._toSQL();
      return this.session.prepareQuery(
        builtQuery,
        void 0,
        name,
        true,
        (rawRows, mapColumnValue) => {
          const rows = rawRows.map(
            (row) => mapRelationalRow(this.schema, this.tableConfig, row, query.selection, mapColumnValue)
          );
          if (this.mode === "first") {
            return rows[0];
          }
          return rows;
        }
      );
    });
  }
  prepare(name) {
    return this._prepare(name);
  }
  _getQuery() {
    return this.dialect.buildRelationalQueryWithoutPK({
      fullSchema: this.fullSchema,
      schema: this.schema,
      tableNamesMap: this.tableNamesMap,
      table: this.table,
      tableConfig: this.tableConfig,
      queryConfig: this.config,
      tableAlias: this.tableConfig.tsName
    });
  }
  /** @internal */
  getSQL() {
    return this._getQuery().sql;
  }
  _toSQL() {
    const query = this._getQuery();
    const builtQuery = this.dialect.sqlToQuery(query.sql);
    return { query, builtQuery };
  }
  toSQL() {
    return this._toSQL().builtQuery;
  }
  authToken;
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  execute() {
    return tracer.startActiveSpan("drizzle.operation", () => {
      return this._prepare().execute(void 0, this.authToken);
    });
  }
};

// node_modules/drizzle-orm/pg-core/query-builders/raw.js
var PgRaw = class extends QueryPromise {
  constructor(execute, sql2, query, mapBatchResult) {
    super();
    this.execute = execute;
    this.sql = sql2;
    this.query = query;
    this.mapBatchResult = mapBatchResult;
  }
  static [entityKind] = "PgRaw";
  /** @internal */
  getSQL() {
    return this.sql;
  }
  getQuery() {
    return this.query;
  }
  mapResult(result, isFromBatch) {
    return isFromBatch ? this.mapBatchResult(result) : result;
  }
  _prepare() {
    return this;
  }
  /** @internal */
  isResponseInArrayMode() {
    return false;
  }
};

// node_modules/drizzle-orm/pg-core/db.js
var PgDatabase = class {
  constructor(dialect, session, schema) {
    this.dialect = dialect;
    this.session = session;
    this._ = schema ? {
      schema: schema.schema,
      fullSchema: schema.fullSchema,
      tableNamesMap: schema.tableNamesMap,
      session
    } : {
      schema: void 0,
      fullSchema: {},
      tableNamesMap: {},
      session
    };
    this.query = {};
    if (this._.schema) {
      for (const [tableName, columns] of Object.entries(this._.schema)) {
        this.query[tableName] = new RelationalQueryBuilder(
          schema.fullSchema,
          this._.schema,
          this._.tableNamesMap,
          schema.fullSchema[tableName],
          columns,
          dialect,
          session
        );
      }
    }
    this.$cache = { invalidate: async (_params) => {
    } };
  }
  static [entityKind] = "PgDatabase";
  query;
  /**
   * Creates a subquery that defines a temporary named result set as a CTE.
   *
   * It is useful for breaking down complex queries into simpler parts and for reusing the result set in subsequent parts of the query.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
   *
   * @param alias The alias for the subquery.
   *
   * Failure to provide an alias will result in a DrizzleTypeError, preventing the subquery from being referenced in other queries.
   *
   * @example
   *
   * ```ts
   * // Create a subquery with alias 'sq' and use it in the select query
   * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
   *
   * const result = await db.with(sq).select().from(sq);
   * ```
   *
   * To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query, you need to add aliases to them:
   *
   * ```ts
   * // Select an arbitrary SQL value as a field in a CTE and reference it in the main query
   * const sq = db.$with('sq').as(db.select({
   *   name: sql<string>`upper(${users.name})`.as('name'),
   * })
   * .from(users));
   *
   * const result = await db.with(sq).select({ name: sq.name }).from(sq);
   * ```
   */
  $with = (alias, selection) => {
    const self = this;
    const as = (qb) => {
      if (typeof qb === "function") {
        qb = qb(new QueryBuilder(self.dialect));
      }
      return new Proxy(
        new WithSubquery(
          qb.getSQL(),
          selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
          alias,
          true
        ),
        new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
      );
    };
    return { as };
  };
  $count(source, filters) {
    return new PgCountBuilder({ source, filters, session: this.session });
  }
  $cache;
  /**
   * Incorporates a previously defined CTE (using `$with`) into the main query.
   *
   * This method allows the main query to reference a temporary named result set.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
   *
   * @param queries The CTEs to incorporate into the main query.
   *
   * @example
   *
   * ```ts
   * // Define a subquery 'sq' as a CTE using $with
   * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
   *
   * // Incorporate the CTE 'sq' into the main query and select from it
   * const result = await db.with(sq).select().from(sq);
   * ```
   */
  with(...queries) {
    const self = this;
    function select(fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: self.session,
        dialect: self.dialect,
        withList: queries
      });
    }
    function selectDistinct(fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: self.session,
        dialect: self.dialect,
        withList: queries,
        distinct: true
      });
    }
    function selectDistinctOn(on, fields) {
      return new PgSelectBuilder({
        fields: fields ?? void 0,
        session: self.session,
        dialect: self.dialect,
        withList: queries,
        distinct: { on }
      });
    }
    function update(table) {
      return new PgUpdateBuilder(table, self.session, self.dialect, queries);
    }
    function insert(table) {
      return new PgInsertBuilder(table, self.session, self.dialect, queries);
    }
    function delete_(table) {
      return new PgDeleteBase(table, self.session, self.dialect, queries);
    }
    return { select, selectDistinct, selectDistinctOn, update, insert, delete: delete_ };
  }
  select(fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: this.session,
      dialect: this.dialect
    });
  }
  selectDistinct(fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: this.session,
      dialect: this.dialect,
      distinct: true
    });
  }
  selectDistinctOn(on, fields) {
    return new PgSelectBuilder({
      fields: fields ?? void 0,
      session: this.session,
      dialect: this.dialect,
      distinct: { on }
    });
  }
  /**
   * Creates an update query.
   *
   * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
   *
   * Use `.set()` method to specify which values to update.
   *
   * See docs: {@link https://orm.drizzle.team/docs/update}
   *
   * @param table The table to update.
   *
   * @example
   *
   * ```ts
   * // Update all rows in the 'cars' table
   * await db.update(cars).set({ color: 'red' });
   *
   * // Update rows with filters and conditions
   * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
   *
   * // Update with returning clause
   * const updatedCar: Car[] = await db.update(cars)
   *   .set({ color: 'red' })
   *   .where(eq(cars.id, 1))
   *   .returning();
   * ```
   */
  update(table) {
    return new PgUpdateBuilder(table, this.session, this.dialect);
  }
  /**
   * Creates an insert query.
   *
   * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert}
   *
   * @param table The table to insert into.
   *
   * @example
   *
   * ```ts
   * // Insert one row
   * await db.insert(cars).values({ brand: 'BMW' });
   *
   * // Insert multiple rows
   * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
   *
   * // Insert with returning clause
   * const insertedCar: Car[] = await db.insert(cars)
   *   .values({ brand: 'BMW' })
   *   .returning();
   * ```
   */
  insert(table) {
    return new PgInsertBuilder(table, this.session, this.dialect);
  }
  /**
   * Creates a delete query.
   *
   * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
   *
   * See docs: {@link https://orm.drizzle.team/docs/delete}
   *
   * @param table The table to delete from.
   *
   * @example
   *
   * ```ts
   * // Delete all rows in the 'cars' table
   * await db.delete(cars);
   *
   * // Delete rows with filters and conditions
   * await db.delete(cars).where(eq(cars.color, 'green'));
   *
   * // Delete with returning clause
   * const deletedCar: Car[] = await db.delete(cars)
   *   .where(eq(cars.id, 1))
   *   .returning();
   * ```
   */
  delete(table) {
    return new PgDeleteBase(table, this.session, this.dialect);
  }
  refreshMaterializedView(view) {
    return new PgRefreshMaterializedView(view, this.session, this.dialect);
  }
  authToken;
  execute(query) {
    const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
    const builtQuery = this.dialect.sqlToQuery(sequel);
    const prepared = this.session.prepareQuery(
      builtQuery,
      void 0,
      void 0,
      false
    );
    return new PgRaw(
      () => prepared.execute(void 0, this.authToken),
      sequel,
      builtQuery,
      (result) => prepared.mapResult(result, true)
    );
  }
  transaction(transaction, config) {
    return this.session.transaction(transaction, config);
  }
};

// node_modules/drizzle-orm/cache/core/cache.js
var Cache = class {
  static [entityKind] = "Cache";
};
var NoopCache = class extends Cache {
  strategy() {
    return "all";
  }
  static [entityKind] = "NoopCache";
  async get(_key) {
    return void 0;
  }
  async put(_hashedQuery, _response, _tables, _config) {
  }
  async onMutate(_params) {
  }
};
async function hashQuery(sql2, params) {
  const dataToHash = `${sql2}-${JSON.stringify(params)}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// node_modules/drizzle-orm/pg-core/session.js
var PgPreparedQuery = class {
  constructor(query, cache, queryMetadata, cacheConfig) {
    this.query = query;
    this.cache = cache;
    this.queryMetadata = queryMetadata;
    this.cacheConfig = cacheConfig;
    if (cache && cache.strategy() === "all" && cacheConfig === void 0) {
      this.cacheConfig = { enable: true, autoInvalidate: true };
    }
    if (!this.cacheConfig?.enable) {
      this.cacheConfig = void 0;
    }
  }
  authToken;
  getQuery() {
    return this.query;
  }
  mapResult(response, _isFromBatch) {
    return response;
  }
  /** @internal */
  setToken(token) {
    this.authToken = token;
    return this;
  }
  static [entityKind] = "PgPreparedQuery";
  /** @internal */
  joinsNotNullableMap;
  /** @internal */
  async queryWithCache(queryString, params, query) {
    if (this.cache === void 0 || is(this.cache, NoopCache) || this.queryMetadata === void 0) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (this.cacheConfig && !this.cacheConfig.enable) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if ((this.queryMetadata.type === "insert" || this.queryMetadata.type === "update" || this.queryMetadata.type === "delete") && this.queryMetadata.tables.length > 0) {
      try {
        const [res] = await Promise.all([
          query(),
          this.cache.onMutate({ tables: this.queryMetadata.tables })
        ]);
        return res;
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (!this.cacheConfig) {
      try {
        return await query();
      } catch (e) {
        throw new DrizzleQueryError(queryString, params, e);
      }
    }
    if (this.queryMetadata.type === "select") {
      const fromCache = await this.cache.get(
        this.cacheConfig.tag ?? await hashQuery(queryString, params),
        this.queryMetadata.tables,
        this.cacheConfig.tag !== void 0,
        this.cacheConfig.autoInvalidate
      );
      if (fromCache === void 0) {
        let result;
        try {
          result = await query();
        } catch (e) {
          throw new DrizzleQueryError(queryString, params, e);
        }
        await this.cache.put(
          this.cacheConfig.tag ?? await hashQuery(queryString, params),
          result,
          // make sure we send tables that were used in a query only if user wants to invalidate it on each write
          this.cacheConfig.autoInvalidate ? this.queryMetadata.tables : [],
          this.cacheConfig.tag !== void 0,
          this.cacheConfig.config
        );
        return result;
      }
      return fromCache;
    }
    try {
      return await query();
    } catch (e) {
      throw new DrizzleQueryError(queryString, params, e);
    }
  }
};
var PgSession = class {
  constructor(dialect) {
    this.dialect = dialect;
  }
  static [entityKind] = "PgSession";
  /** @internal */
  execute(query, token) {
    return tracer.startActiveSpan("drizzle.operation", () => {
      const prepared = tracer.startActiveSpan("drizzle.prepareQuery", () => {
        return this.prepareQuery(
          this.dialect.sqlToQuery(query),
          void 0,
          void 0,
          false
        );
      });
      return prepared.setToken(token).execute(void 0, token);
    });
  }
  all(query) {
    return this.prepareQuery(
      this.dialect.sqlToQuery(query),
      void 0,
      void 0,
      false
    ).all();
  }
  /** @internal */
  async count(sql2, token) {
    const res = await this.execute(sql2, token);
    return Number(
      res[0]["count"]
    );
  }
};
var PgTransaction = class extends PgDatabase {
  constructor(dialect, session, schema, nestedIndex = 0) {
    super(dialect, session, schema);
    this.schema = schema;
    this.nestedIndex = nestedIndex;
  }
  static [entityKind] = "PgTransaction";
  rollback() {
    throw new TransactionRollbackError();
  }
  /** @internal */
  getTransactionConfigSQL(config) {
    const chunks = [];
    if (config.isolationLevel) {
      chunks.push(`isolation level ${config.isolationLevel}`);
    }
    if (config.accessMode) {
      chunks.push(config.accessMode);
    }
    if (typeof config.deferrable === "boolean") {
      chunks.push(config.deferrable ? "deferrable" : "not deferrable");
    }
    return sql.raw(chunks.join(" "));
  }
  setTransaction(config) {
    return this.session.execute(sql`set transaction ${this.getTransactionConfigSQL(config)}`);
  }
};

// node_modules/drizzle-orm/postgres-js/session.js
var PostgresJsPreparedQuery = class extends PgPreparedQuery {
  constructor(client, queryString, params, logger, cache, queryMetadata, cacheConfig, fields, _isResponseInArrayMode, customResultMapper) {
    super({ sql: queryString, params }, cache, queryMetadata, cacheConfig);
    this.client = client;
    this.queryString = queryString;
    this.params = params;
    this.logger = logger;
    this.fields = fields;
    this._isResponseInArrayMode = _isResponseInArrayMode;
    this.customResultMapper = customResultMapper;
  }
  static [entityKind] = "PostgresJsPreparedQuery";
  async execute(placeholderValues = {}) {
    return tracer.startActiveSpan("drizzle.execute", async (span) => {
      const params = fillPlaceholders(this.params, placeholderValues);
      span?.setAttributes({
        "drizzle.query.text": this.queryString,
        "drizzle.query.params": JSON.stringify(params)
      });
      this.logger.logQuery(this.queryString, params);
      const { fields, queryString: query, client, joinsNotNullableMap, customResultMapper } = this;
      if (!fields && !customResultMapper) {
        return tracer.startActiveSpan("drizzle.driver.execute", () => {
          return this.queryWithCache(query, params, async () => {
            return await client.unsafe(query, params);
          });
        });
      }
      const rows = await tracer.startActiveSpan("drizzle.driver.execute", () => {
        span?.setAttributes({
          "drizzle.query.text": query,
          "drizzle.query.params": JSON.stringify(params)
        });
        return this.queryWithCache(query, params, async () => {
          return await client.unsafe(query, params).values();
        });
      });
      return tracer.startActiveSpan("drizzle.mapResponse", () => {
        return customResultMapper ? customResultMapper(rows) : rows.map((row) => mapResultRow(fields, row, joinsNotNullableMap));
      });
    });
  }
  all(placeholderValues = {}) {
    return tracer.startActiveSpan("drizzle.execute", async (span) => {
      const params = fillPlaceholders(this.params, placeholderValues);
      span?.setAttributes({
        "drizzle.query.text": this.queryString,
        "drizzle.query.params": JSON.stringify(params)
      });
      this.logger.logQuery(this.queryString, params);
      return tracer.startActiveSpan("drizzle.driver.execute", () => {
        span?.setAttributes({
          "drizzle.query.text": this.queryString,
          "drizzle.query.params": JSON.stringify(params)
        });
        return this.queryWithCache(this.queryString, params, async () => {
          return this.client.unsafe(this.queryString, params);
        });
      });
    });
  }
  /** @internal */
  isResponseInArrayMode() {
    return this._isResponseInArrayMode;
  }
};
var PostgresJsSession = class _PostgresJsSession extends PgSession {
  constructor(client, dialect, schema, options = {}) {
    super(dialect);
    this.client = client;
    this.schema = schema;
    this.options = options;
    this.logger = options.logger ?? new NoopLogger();
    this.cache = options.cache ?? new NoopCache();
  }
  static [entityKind] = "PostgresJsSession";
  logger;
  cache;
  prepareQuery(query, fields, name, isResponseInArrayMode, customResultMapper, queryMetadata, cacheConfig) {
    return new PostgresJsPreparedQuery(
      this.client,
      query.sql,
      query.params,
      this.logger,
      this.cache,
      queryMetadata,
      cacheConfig,
      fields,
      isResponseInArrayMode,
      customResultMapper
    );
  }
  query(query, params) {
    this.logger.logQuery(query, params);
    return this.client.unsafe(query, params).values();
  }
  queryObjects(query, params) {
    return this.client.unsafe(query, params);
  }
  transaction(transaction, config) {
    return this.client.begin(async (client) => {
      const session = new _PostgresJsSession(
        client,
        this.dialect,
        this.schema,
        this.options
      );
      const tx = new PostgresJsTransaction(this.dialect, session, this.schema);
      if (config) {
        await tx.setTransaction(config);
      }
      return transaction(tx);
    });
  }
};
var PostgresJsTransaction = class _PostgresJsTransaction extends PgTransaction {
  constructor(dialect, session, schema, nestedIndex = 0) {
    super(dialect, session, schema, nestedIndex);
    this.session = session;
  }
  static [entityKind] = "PostgresJsTransaction";
  transaction(transaction) {
    return this.session.client.savepoint((client) => {
      const session = new PostgresJsSession(
        client,
        this.dialect,
        this.schema,
        this.session.options
      );
      const tx = new _PostgresJsTransaction(this.dialect, session, this.schema);
      return transaction(tx);
    });
  }
};

// node_modules/drizzle-orm/postgres-js/driver.js
var PostgresJsDatabase = class extends PgDatabase {
  static [entityKind] = "PostgresJsDatabase";
};
function construct(client, config = {}) {
  const transparentParser = (val) => val;
  for (const type of ["1184", "1082", "1083", "1114", "1182", "1185", "1115", "1231"]) {
    client.options.parsers[type] = transparentParser;
    client.options.serializers[type] = transparentParser;
  }
  client.options.serializers["114"] = transparentParser;
  client.options.serializers["3802"] = transparentParser;
  const dialect = new PgDialect({ casing: config.casing });
  let logger;
  if (config.logger === true) {
    logger = new DefaultLogger();
  } else if (config.logger !== false) {
    logger = config.logger;
  }
  let schema;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(
      config.schema,
      createTableRelationsHelpers
    );
    schema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap
    };
  }
  const session = new PostgresJsSession(client, dialect, schema, { logger, cache: config.cache });
  const db = new PostgresJsDatabase(dialect, session, schema);
  db.$client = client;
  db.$cache = config.cache;
  if (db.$cache) {
    db.$cache["invalidate"] = config.cache?.onMutate;
  }
  return db;
}
function drizzle(...params) {
  if (typeof params[0] === "string") {
    const instance = pgClient(params[0]);
    return construct(instance, params[1]);
  }
  if (isConfig(params[0])) {
    const { connection: connection2, client, ...drizzleConfig } = params[0];
    if (client) return construct(client, drizzleConfig);
    if (typeof connection2 === "object" && connection2.url !== void 0) {
      const { url, ...config } = connection2;
      const instance2 = pgClient(url, config);
      return construct(instance2, drizzleConfig);
    }
    const instance = pgClient(connection2);
    return construct(instance, drizzleConfig);
  }
  return construct(params[0], params[1]);
}
((drizzle2) => {
  function mock(config) {
    return construct({
      options: {
        parsers: {},
        serializers: {}
      }
    }, config);
  }
  drizzle2.mock = mock;
})(drizzle || (drizzle = {}));

// supabase/functions/payroll-api/supabase-runtime.ts
import postgres from "npm:postgres@3.4.7";
var databaseUrl = Deno.env.get("SUPABASE_DB_URL");
if (!databaseUrl) {
  throw new Error("Supabase did not provide the SUPABASE_DB_URL server secret.");
}
var connection = postgres(databaseUrl, {
  prepare: false,
  max: 1,
  idle_timeout: 5,
  connect_timeout: 5,
  max_lifetime: 60
});
var database = drizzle(connection);
function getDb() {
  return database;
}
var PreparedStatement = class _PreparedStatement {
  constructor(text2, values = []) {
    this.text = text2;
    this.values = values;
  }
  bind(...values) {
    return new _PreparedStatement(this.text, values);
  }
};
function postgresPlaceholders(query) {
  let position = 0;
  return query.replace(/\?/g, () => `$${++position}`);
}
function getRawDb() {
  return {
    prepare(query) {
      return new PreparedStatement(query);
    },
    async batch(statements) {
      if (!statements.length) return [];
      return connection.begin(async (transaction) => {
        return Promise.all(
          statements.map(
            (statement) => transaction.unsafe(
              postgresPlaceholders(statement.text),
              statement.values
            )
          )
        );
      });
    }
  };
}

// supabase/functions/payroll-api/generated/schema.ts
var appUsers = pgTable("app_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  employeeCode: text("employee_code"),
  department: text("department"),
  dateOfJoining: text("date_of_joining"),
  mobileNumber: text("mobile_number"),
  role: text("role").notNull().default("hr_team"),
  status: text("status").notNull().default("active"),
  permissionsJson: text("permissions_json").notNull(),
  clientScopeJson: text("client_scope_json").notNull().default("[]"),
  unitScopeJson: text("unit_scope_json").notNull().default("[]"),
  hostelScopeJson: text("hostel_scope_json").notNull().default("[]"),
  canApprovePayroll: integer("can_approve_payroll").notNull().default(0),
  approvalManagerEmail: text("approval_manager_email"),
  approvalSequence: integer("approval_sequence").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text("last_login_at")
});
var vendors = pgTable("vendors", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  epfCode: text("epf_code"),
  esiCode: text("esi_code"),
  gstin: text("gstin"),
  remarks: text("remarks"),
  logoDataUrl: text("logo_data_url"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var accommodationTypes = pgTable(
  "accommodation_types",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id").notNull().references(() => vendors.id),
    name: text("name").notNull(),
    remarks: text("remarks"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("accommodation_type_client_name_unique").on(
      table.vendorId,
      table.name
    )
  ]
);
var hostels = pgTable(
  "hostels",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id").notNull().references(() => vendors.id),
    accommodationTypeId: text("accommodation_type_id").references(
      () => accommodationTypes.id
    ),
    name: text("name").notNull(),
    address: text("address"),
    inchargeName: text("incharge_name"),
    ebMeterNumber: text("eb_meter_number"),
    clientScopeJson: text("client_scope_json").notNull().default("[]"),
    status: text("status").notNull().default("active"),
    remarks: text("remarks"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("hostel_client_name_unique").on(table.vendorId, table.name)
  ]
);
var accommodationRooms = pgTable(
  "accommodation_rooms",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id").notNull().references(() => vendors.id),
    accommodationTypeId: text("accommodation_type_id").notNull().references(() => accommodationTypes.id),
    hostelId: text("hostel_id").references(() => hostels.id),
    rentSettingsJson: text("rent_settings_json").notNull().default("{}"),
    rentCutoffDay: integer("rent_cutoff_day").notNull().default(25),
    lateJoinRentPercent: doublePrecision("late_join_rent_percent").notNull().default(50),
    roomNumber: text("room_number").notNull(),
    capacity: integer("capacity").notNull().default(0),
    address: text("address"),
    remarks: text("remarks"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("accommodation_room_client_type_number_unique").on(
      table.vendorId,
      table.accommodationTypeId,
      table.roomNumber
    )
  ]
);
var hostelUtilityReadings = pgTable(
  "hostel_utility_readings",
  {
    id: text("id").primaryKey(),
    hostelId: text("hostel_id").notNull().references(() => hostels.id),
    readingDate: text("reading_date").notNull(),
    utilityType: text("utility_type").notNull(),
    readingValue: doublePrecision("reading_value").notNull().default(0),
    consumption: doublePrecision("consumption").notNull().default(0),
    tankerQuantity: doublePrecision("tanker_quantity").notNull().default(0),
    amount: doublePrecision("amount").notNull().default(0),
    activityName: text("activity_name"),
    remarks: text("remarks"),
    enteredBy: text("entered_by"),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    status: text("status").notNull().default("draft"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("hostel_utility_date_unique").on(
      table.hostelId,
      table.utilityType,
      table.readingDate
    )
  ]
);
var clientUnits = pgTable("client_units", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id),
  clientName: text("client_name").notNull(),
  unitName: text("unit_name").notNull(),
  location: text("location").notNull(),
  employeeCount: integer("employee_count").notNull().default(0),
  remarks: text("remarks"),
  attendanceCycleStartDay: integer("attendance_cycle_start_day").notNull().default(1),
  attendanceCycleEndDay: integer("attendance_cycle_end_day").notNull().default(31),
  attendanceWorkingDays: integer("attendance_working_days").notNull().default(26),
  overtimeMultiplier: doublePrecision("overtime_multiplier").notNull().default(1),
  voucherHeader: text("voucher_header"),
  payslipTitle: text("payslip_title"),
  payslipSubtitle: text("payslip_subtitle"),
  payslipAddress: text("payslip_address"),
  payslipContact: text("payslip_contact"),
  payslipFooter: text("payslip_footer"),
  payslipEarningsJson: text("payslip_earnings_json").notNull().default("[]"),
  payslipDeductionsJson: text("payslip_deductions_json").notNull().default("[]"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var revenueMonthPlans = pgTable("revenue_month_plans", {
  id: text("id").primaryKey(),
  month: text("month").notNull(),
  clientUnitId: text("client_unit_id").notNull().references(() => clientUnits.id),
  configJson: text("config_json").notNull(),
  revision: integer("revision").notNull().default(1),
  confirmedAt: text("confirmed_at"),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull()
}, (table) => [uniqueIndex("revenue_month_unit_unique").on(table.month, table.clientUnitId)]);
var applicationDocuments = pgTable("application_documents", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  category: text("category").notNull(),
  filename: text("filename").notNull(),
  dataUrl: text("data_url").notNull(),
  status: text("status").notNull().default("pending_approval"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: text("uploaded_at")
}, (table) => [uniqueIndex("application_documents_employee_category").on(table.employeeId, table.category)]);
var employees = pgTable("employees", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id),
  clientUnitId: text("client_unit_id").notNull().references(() => clientUnits.id),
  employeeCode: text("employee_code").notNull().unique(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  dateOfJoining: text("date_of_joining").notNull(),
  dateOfBirth: text("date_of_birth"),
  dateOfLeaving: text("date_of_leaving"),
  finalPayrollMonth: text("final_payroll_month"),
  uanMasked: text("uan_masked"),
  esiMasked: text("esi_masked"),
  bankAccountMasked: text("bank_account_masked"),
  ifscMasked: text("ifsc_masked"),
  bankName: text("bank_name"),
  bankBranch: text("bank_branch"),
  accommodationType: text("accommodation_type").notNull().default("Tamil"),
  roomId: text("room_id").references(() => accommodationRooms.id),
  roomNumber: text("room_number"),
  roomRentAmount: doublePrecision("room_rent_amount").notNull().default(0),
  photoDataUrl: text("photo_data_url"),
  mobileNumber: text("mobile_number"),
  emailAddress: text("email_address"),
  emergencyContactNumber: text("emergency_contact_number"),
  addressLine: text("address_line"),
  district: text("district"),
  stateName: text("state_name"),
  pincode: text("pincode"),
  bloodGroup: text("blood_group"),
  gender: text("gender"),
  fatherName: text("father_name"),
  spouseName: text("spouse_name"),
  maritalStatus: text("marital_status"),
  highestQualification: text("highest_qualification"),
  applicationJson: text("application_json"),
  pfApplicable: integer("pf_applicable").notNull().default(1),
  pfWageAmount: doublePrecision("pf_wage_amount").notNull().default(0),
  esiApplicable: integer("esi_applicable").notNull().default(1),
  esiWageAmount: doublePrecision("esi_wage_amount").notNull().default(0),
  ptApplicable: integer("pt_applicable").notNull().default(1),
  lwfApplicable: integer("lwf_applicable").notNull().default(1),
  paymentMode: text("payment_mode").notNull().default("bank"),
  salaryAmount: doublePrecision("salary_amount").notNull().default(0),
  salaryBasis: text("salary_basis").notNull().default("monthly"),
  defaultShift: text("default_shift").notNull().default("General"),
  shiftPattern: text("shift_pattern").notNull().default("general"),
  applicableShiftsJson: text("applicable_shifts_json").notNull().default("[]"),
  remarks: text("remarks"),
  complianceStatus: text("compliance_status").notNull().default("ready"),
  status: text("status").notNull().default("active"),
  employmentType: text("employment_type").notNull().default("client"),
  processingStage: text("processing_stage").notNull().default("field_hr_draft"),
  finalizedBy: text("finalized_by"),
  finalizedAt: text("finalized_at")
});
var vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id),
  registrationNumber: text("registration_number").notNull().unique(),
  vehicleName: text("vehicle_name").notNull(),
  vehicleType: text("vehicle_type").notNull().default("car"),
  currentOdometer: doublePrecision("current_odometer").notNull().default(0),
  permitExpiry: text("permit_expiry"),
  insuranceExpiry: text("insurance_expiry"),
  fcExpiry: text("fc_expiry"),
  pollutionExpiry: text("pollution_expiry"),
  nextServiceDate: text("next_service_date"),
  nextServiceKm: doublePrecision("next_service_km"),
  tyreChangedDate: text("tyre_changed_date"),
  tyreChangedKm: doublePrecision("tyre_changed_km"),
  lastWaterWashDate: text("last_water_wash_date"),
  lastWheelAlignmentDate: text("last_wheel_alignment_date"),
  status: text("status").notNull().default("active"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var vehicleRecords = pgTable("vehicle_records", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id),
  recordDate: text("record_date").notNull(),
  recordType: text("record_type").notNull(),
  tripFrom: text("trip_from"),
  tripTo: text("trip_to"),
  purpose: text("purpose"),
  startKm: doublePrecision("start_km"),
  endKm: doublePrecision("end_km"),
  litres: doublePrecision("litres").notNull().default(0),
  amount: doublePrecision("amount").notNull().default(0),
  vendorName: text("vendor_name"),
  nextDueDate: text("next_due_date"),
  nextDueKm: doublePrecision("next_due_km"),
  remarks: text("remarks"),
  enteredBy: text("entered_by"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var utilityMeters = pgTable("utility_meters", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id),
  locationType: text("location_type").notNull(),
  locationName: text("location_name").notNull(),
  meterNumber: text("meter_number"),
  status: text("status").notNull().default("active"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var ebReadings = pgTable(
  "eb_readings",
  {
    id: text("id").primaryKey(),
    meterId: text("meter_id").notNull().references(() => utilityMeters.id),
    readingDate: text("reading_date").notNull(),
    readingValue: doublePrecision("reading_value").notNull(),
    unitsConsumed: doublePrecision("units_consumed").notNull().default(0),
    amount: doublePrecision("amount").notNull().default(0),
    remarks: text("remarks"),
    enteredBy: text("entered_by"),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
    status: text("status").notNull().default("draft"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("eb_meter_reading_date_unique").on(
      table.meterId,
      table.readingDate
    )
  ]
);
var shiftDefinitions = pgTable(
  "shift_definitions",
  {
    id: text("id").primaryKey(),
    vendorId: text("vendor_id").notNull().references(() => vendors.id),
    clientUnitId: text("client_unit_id").references(() => clientUnits.id),
    name: text("name").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    breakMinutes: integer("break_minutes").notNull().default(0),
    requiredWorkMinutes: integer("required_work_minutes").notNull().default(480),
    lateGraceMinutes: integer("late_grace_minutes").notNull().default(0),
    lateDeductionMinutes: integer("late_deduction_minutes").notNull().default(0),
    earlyGraceMinutes: integer("early_grace_minutes").notNull().default(0),
    earlyDeductionMinutes: integer("early_deduction_minutes").notNull().default(0),
    otMode: text("ot_mode").notNull().default("approval"),
    fixedOtHours: doublePrecision("fixed_ot_hours").notNull().default(0),
    remarks: text("remarks"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("shift_client_name_unique").on(table.vendorId, table.name)
  ]
);
var payrollRemarks = pgTable("payroll_remarks", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id),
  title: text("title").notNull(),
  category: text("category").notNull().default("general"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var payrollRules = pgTable("payroll_rules", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().unique().references(() => vendors.id),
  standardWorkingDays: integer("standard_working_days").notNull().default(26),
  pfRate: doublePrecision("pf_rate").notNull().default(0),
  esiRate: doublePrecision("esi_rate").notNull().default(0),
  professionalTax: doublePrecision("professional_tax").notNull().default(0),
  lwf: doublePrecision("lwf").notNull().default(0),
  overtimeHourlyRate: doublePrecision("overtime_hourly_rate").notNull().default(0),
  paidLeave: integer("paid_leave").notNull().default(0),
  paidWeekOff: integer("paid_week_off").notNull().default(0),
  effectiveFrom: text("effective_from").notNull().default("2026-01-01"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var attendanceEntries = pgTable("attendance_entries", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  attendanceDate: text("attendance_date").notNull(),
  statusCode: text("status_code").notNull(),
  shiftCode: text("shift_code").notNull(),
  overtimeHours: doublePrecision("overtime_hours").notNull().default(0),
  punchIn: text("punch_in"),
  punchOut: text("punch_out"),
  workedHours: doublePrecision("worked_hours").notNull().default(0),
  deductionHours: doublePrecision("deduction_hours").notNull().default(0),
  remarks: text("remarks"),
  source: text("source").notNull().default("manual"),
  updatedBy: text("updated_by"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var payrollRuns = pgTable("payroll_runs", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id").notNull().references(() => vendors.id),
  clientUnitId: text("client_unit_id").notNull().references(() => clientUnits.id),
  payPeriod: text("pay_period").notNull(),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  workingDays: integer("working_days").notNull().default(26),
  processingMode: text("processing_mode").notNull().default("attendance"),
  status: text("status").notNull().default("draft"),
  employeeCount: integer("employee_count").notNull().default(0),
  grossEarnings: doublePrecision("gross_earnings").notNull().default(0),
  statutoryDeductions: doublePrecision("statutory_deductions").notNull().default(0),
  otherDeductions: doublePrecision("other_deductions").notNull().default(0),
  accommodationDeductions: doublePrecision("accommodation_deductions").notNull().default(0),
  netPayable: doublePrecision("net_payable").notNull().default(0),
  bankPayable: doublePrecision("bank_payable").notNull().default(0),
  cashPayable: doublePrecision("cash_payable").notNull().default(0),
  issueCount: integer("issue_count").notNull().default(0),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var accommodationRoomExpenses = pgTable(
  "accommodation_room_expenses",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => accommodationRooms.id),
    payPeriod: text("pay_period").notNull(),
    gasAmount: doublePrecision("gas_amount").notNull().default(0),
    gasDate: text("gas_date"),
    gasCylinderCount: integer("gas_cylinder_count").notNull().default(0),
    gasPaymentReference: text("gas_payment_reference"),
    rationAmount: doublePrecision("ration_amount").notNull().default(0),
    rationDate: text("ration_date"),
    rationPaymentReference: text("ration_payment_reference"),
    provisionAmount: doublePrecision("provision_amount").notNull().default(0),
    provisionDate: text("provision_date"),
    provisionPaymentReference: text("provision_payment_reference"),
    roomRentAmount: doublePrecision("room_rent_amount").notNull().default(0),
    transportRentAmount: doublePrecision("transport_rent_amount").notNull().default(0),
    occupantCount: integer("occupant_count").notNull().default(0),
    status: text("status").notNull().default("draft"),
    notes: text("notes"),
    finalizedBy: text("finalized_by"),
    finalizedAt: text("finalized_at"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("accommodation_room_period_idx").on(
      table.roomId,
      table.payPeriod
    )
  ]
);
var payrollItems = pgTable("payroll_items", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => payrollRuns.id),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  presentDays: doublePrecision("present_days").notNull().default(0),
  absentDays: doublePrecision("absent_days").notNull().default(0),
  leaveDays: doublePrecision("leave_days").notNull().default(0),
  weekOffDays: doublePrecision("week_off_days").notNull().default(0),
  holidayPresentDays: doublePrecision("holiday_present_days").notNull().default(0),
  payableDays: doublePrecision("payable_days").notNull().default(0),
  overtimeHours: doublePrecision("overtime_hours").notNull().default(0),
  fixedWorkingDays: doublePrecision("fixed_working_days").notNull().default(0),
  nfhDays: doublePrecision("nfh_days").notNull().default(0),
  compOffDays: doublePrecision("comp_off_days").notNull().default(0),
  onDutyDays: doublePrecision("on_duty_days").notNull().default(0),
  sundayDays: doublePrecision("sunday_days").notNull().default(0),
  plDays: doublePrecision("pl_days").notNull().default(0),
  clDays: doublePrecision("cl_days").notNull().default(0),
  slDays: doublePrecision("sl_days").notNull().default(0),
  importedGrossEarnings: doublePrecision("imported_gross_earnings"),
  importedTotalDeductions: doublePrecision("imported_total_deductions"),
  importedNetPayable: doublePrecision("imported_net_payable"),
  basic: doublePrecision("basic").notNull().default(0),
  da: doublePrecision("da").notNull().default(0),
  hra: doublePrecision("hra").notNull().default(0),
  conveyance: doublePrecision("conveyance").notNull().default(0),
  foodAllowance: doublePrecision("food_allowance").notNull().default(0),
  nightAllowance: doublePrecision("night_allowance").notNull().default(0),
  overtimeWages: doublePrecision("overtime_wages").notNull().default(0),
  attendanceBonus: doublePrecision("attendance_bonus").notNull().default(0),
  arrears: doublePrecision("arrears").notNull().default(0),
  holidayWages: doublePrecision("holiday_wages").notNull().default(0),
  sundayEarnings: doublePrecision("sunday_earnings").notNull().default(0),
  leaveWages: doublePrecision("leave_wages").notNull().default(0),
  roomAllowance: doublePrecision("room_allowance").notNull().default(0),
  productionIncentive: doublePrecision("production_incentive").notNull().default(0),
  medicalAllowance: doublePrecision("medical_allowance").notNull().default(0),
  pfDeduction: doublePrecision("pf_deduction").notNull().default(0),
  esiDeduction: doublePrecision("esi_deduction").notNull().default(0),
  professionalTax: doublePrecision("professional_tax").notNull().default(0),
  lwf: doublePrecision("lwf").notNull().default(0),
  canteen: doublePrecision("canteen").notNull().default(0),
  snacks: doublePrecision("snacks").notNull().default(0),
  tent: doublePrecision("tent").notNull().default(0),
  advance: doublePrecision("advance").notNull().default(0),
  otherDeduction: doublePrecision("other_deduction").notNull().default(0),
  tds: doublePrecision("tds").notNull().default(0),
  medicalInsurance: doublePrecision("medical_insurance").notNull().default(0),
  accommodationDeduction: doublePrecision("accommodation_deduction").notNull().default(0),
  returnAmount: doublePrecision("return_amount").notNull().default(0),
  grossEarnings: doublePrecision("gross_earnings").notNull().default(0),
  totalDeductions: doublePrecision("total_deductions").notNull().default(0),
  netPayable: doublePrecision("net_payable").notNull().default(0),
  validationStatus: text("validation_status").notNull().default("ready"),
  validationMessage: text("validation_message")
});
var payrollBatches = pgTable(
  "payroll_batches",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => payrollRuns.id),
    accommodationType: text("accommodation_type").notNull(),
    employeeCount: integer("employee_count").notNull().default(0),
    grossEarnings: doublePrecision("gross_earnings").notNull().default(0),
    netPayable: doublePrecision("net_payable").notNull().default(0),
    status: text("status").notNull().default("prepared"),
    paymentReference: text("payment_reference"),
    preparedBy: text("prepared_by"),
    preparedAt: text("prepared_at"),
    clearedBy: text("cleared_by"),
    clearedAt: text("cleared_at"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("payroll_batch_run_accommodation_unique").on(
      table.runId,
      table.accommodationType
    )
  ]
);
var paymentExportBatches = pgTable(
  "payment_export_batches",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => payrollRuns.id),
    status: text("status").notNull().default("locked"),
    exportFormat: text("export_format"),
    employeeCount: integer("employee_count").notNull().default(0),
    totalPayable: doublePrecision("total_payable").notNull().default(0),
    lockedBy: text("locked_by").notNull(),
    lockedAt: text("locked_at").notNull(),
    downloadedBy: text("downloaded_by"),
    downloadedAt: text("downloaded_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    index("payment_export_batches_run_status_idx").on(
      table.runId,
      table.status
    )
  ]
);
var paymentExportBatchItems = pgTable(
  "payment_export_batch_items",
  {
    id: text("id").primaryKey(),
    batchId: text("batch_id").notNull().references(() => paymentExportBatches.id, { onDelete: "cascade" }),
    runId: text("run_id").notNull().references(() => payrollRuns.id),
    payrollItemId: text("payroll_item_id").notNull().references(() => payrollItems.id),
    employeeId: text("employee_id").notNull().references(() => employees.id),
    amount: doublePrecision("amount").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("payment_export_batch_run_item_unique").on(
      table.runId,
      table.payrollItemId
    ),
    index("payment_export_batch_items_batch_idx").on(table.batchId),
    index("payment_export_batch_items_payroll_item_idx").on(
      table.payrollItemId
    ),
    index("payment_export_batch_items_employee_fk_idx").on(table.employeeId),
    index("payment_export_batch_items_employee_idx").on(
      table.runId,
      table.employeeId
    )
  ]
);
var accommodationCharges = pgTable("accommodation_charges", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  runId: text("run_id").notNull().references(() => payrollRuns.id),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  roomExpenseId: text("room_expense_id").references(
    () => accommodationRoomExpenses.id
  ),
  roomNumber: text("room_number"),
  idCard: doublePrecision("id_card").notNull().default(0),
  rent: doublePrecision("rent").notNull().default(0),
  bus: doublePrecision("bus").notNull().default(0),
  medical: doublePrecision("medical").notNull().default(0),
  ticket: doublePrecision("ticket").notNull().default(0),
  shoe: doublePrecision("shoe").notNull().default(0),
  advance: doublePrecision("advance").notNull().default(0),
  food: doublePrecision("food").notNull().default(0),
  aadhaarUpdate: doublePrecision("aadhaar_update").notNull().default(0),
  bankAccountCharge: doublePrecision("bank_account_charge").notNull().default(0),
  tshirt: doublePrecision("tshirt").notNull().default(0),
  oldPending: doublePrecision("old_pending").notNull().default(0),
  gasShare: doublePrecision("gas_share").notNull().default(0),
  rationShare: doublePrecision("ration_share").notNull().default(0),
  provisionShare: doublePrecision("provision_share").notNull().default(0),
  returnAmount: doublePrecision("return_amount").notNull().default(0)
});
var recoveryEntries = pgTable("recovery_entries", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => payrollRuns.id),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  recoveryDate: text("recovery_date").notNull(),
  recoveryType: text("recovery_type").notNull(),
  amount: doublePrecision("amount").notNull().default(0),
  reference: text("reference"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var recoveryFinalizations = pgTable(
  "recovery_finalizations",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => payrollRuns.id),
    employeeId: text("employee_id").notNull().references(() => employees.id),
    voucherNumber: text("voucher_number").notNull().unique(),
    finalizedBy: text("finalized_by"),
    finalizedAt: text("finalized_at").notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => [
    uniqueIndex("recovery_finalization_run_employee_unique").on(
      table.runId,
      table.employeeId
    )
  ]
);
var auditEvents = pgTable("audit_events", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  summary: text("summary").notNull(),
  actorEmail: text("actor_email"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});
var staffTasks = pgTable("staff_tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  assignedToUserId: text("assigned_to_user_id").references(() => appUsers.id),
  assignedToName: text("assigned_to_name").notNull(),
  assignedToPhone: text("assigned_to_phone").notNull(),
  priority: text("priority").notNull().default("normal"),
  dueDate: text("due_date"),
  status: text("status").notNull().default("pending"),
  completedAt: text("completed_at"),
  completionNotes: text("completion_notes"),
  acceptedAt: text("accepted_at"),
  lastReminderAt: text("last_reminder_at"),
  reminderCount: integer("reminder_count").default(0),
  autoRemind: integer("auto_remind").default(1),
  whatsappMessageId: text("whatsapp_message_id"),
  whatsappStatus: text("whatsapp_status").default("pending"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`)
});

// supabase/functions/payroll-api/generated/whatsapp.ts
var DEFAULT_PHONE_NUMBER_ID = "1320562981133693";
var DEFAULT_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "EAAr6ubzWUqgBSkbHTSH8qVAqqE9Y241IGKL4RXS5ZAILEXPjs3gGvvHK3tYy3AAD2qPPwrcf8EDnK5MS2ToyhDmqg26Hu8eHunqMI6XThTIupiZAJZCLH22GlQujC3ZBUiRJYsWxX8sQIomyavnNTLoHh53ejtPC3AZCRhnQGDv0999724ZCyoprjCI42e11cvUBKIlyU88VpNXqGQq1h6sae80er9ZBx18vkpoZAul0Q9B78qIiZC23gHsVAKBhZCGGsW7NWJ6D3EvDF3gU59mWpH9rp67AZDZD";
function formatWhatsAppPhone(phone) {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith("0")) return `91${cleaned.slice(1)}`;
  return cleaned;
}
async function sendWhatsAppTextMessage(toPhone, text2, config) {
  const phoneId = config?.phoneNumberId || DEFAULT_PHONE_NUMBER_ID;
  const token = config?.accessToken || DEFAULT_ACCESS_TOKEN;
  const formattedTo = formatWhatsAppPhone(toPhone);
  try {
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "text",
        text: {
          body: text2
        }
      })
    });
    const data = await res.json();
    if (data.messages && data.messages[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    const errMsg = data.error?.message || "Failed to deliver WhatsApp message";
    return { success: false, error: errMsg };
  } catch (err) {
    return { success: false, error: err.message || "Network error sending WhatsApp message" };
  }
}
async function sendWhatsAppInteractiveButtons(toPhone, bodyText, buttons, config) {
  const phoneId = config?.phoneNumberId || DEFAULT_PHONE_NUMBER_ID;
  const token = config?.accessToken || DEFAULT_ACCESS_TOKEN;
  const formattedTo = formatWhatsAppPhone(toPhone);
  try {
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedTo,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: bodyText
          },
          action: {
            buttons: buttons.slice(0, 3).map((btn) => ({
              type: "reply",
              reply: {
                id: btn.id.slice(0, 256),
                title: btn.title.slice(0, 20)
              }
            }))
          }
        }
      })
    });
    const data = await res.json();
    if (data.messages && data.messages[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return sendWhatsAppTextMessage(toPhone, bodyText, config);
  } catch (err) {
    return sendWhatsAppTextMessage(toPhone, bodyText, config);
  }
}
async function sendTaskAssignmentWhatsApp(task, config) {
  const priorityBadge = task.priority === "urgent" ? "\u{1F6A8} URGENT" : task.priority === "high" ? "\u26A1 HIGH" : "\u{1F4CC} NORMAL";
  const due = task.dueDate ? `\u{1F4C5} *Due Date:* ${task.dueDate}
` : "";
  const desc2 = task.description ? `\u{1F4DD} *Details:* ${task.description}
` : "";
  const header = task.isReminder ? `\u23F0 *Joy HRMS - Task Reminder #${task.reminderNumber || 1}*` : `\u{1F514} *Joy HRMS - New Task Assigned*`;
  const text2 = `${header}

Hello *${task.assignedToName}*,
${task.isReminder ? "This is a reminder for your assigned task:" : "A new task has been assigned to you:"}

\u{1F4CC} *Task:* ${task.title}
${desc2}\u26A1 *Priority:* ${priorityBadge}
${due}\u{1F464} *Assigned By:* ${task.createdBy}

Please tap an action button below:`;
  return sendWhatsAppInteractiveButtons(
    task.assignedToPhone,
    text2,
    [
      { id: `task_accept_${task.id}`, title: "\u{1F44D} Accept Task" },
      { id: `task_complete_${task.id}`, title: "\u2705 Task Completed" }
    ],
    config
  );
}
async function sendTaskAcceptedAlertWhatsApp(adminPhone, task, config) {
  const text2 = `\u{1F440} *Joy HRMS - Task Accepted Alert*

\u{1F4CC} *Task:* ${task.title}
\u{1F464} *Accepted By:* ${task.assignedToName}
\u23F0 *Accepted At:* ${task.acceptedAt}

Staff has viewed the task and confirmed they are working on it.`;
  return sendWhatsAppTextMessage(adminPhone, text2, config);
}
async function sendTaskCompletedAlertWhatsApp(adminPhone, task, config) {
  const notes = task.completionNotes ? `\u{1F4DD} *Notes:* ${task.completionNotes}
` : "";
  const text2 = `\u2705 *Joy HRMS - Task Completed Alert*

\u{1F4CC} *Task:* ${task.title}
\u{1F464} *Completed By:* ${task.assignedToName}
\u23F0 *Completed At:* ${task.completedAt}
${notes}
Task has been automatically marked as COMPLETED in the portal.`;
  return sendWhatsAppTextMessage(adminPhone, text2, config);
}

// supabase/functions/payroll-api/generated/payroll-calculations.ts
var ATTENDANCE_CODES = ["P", "HD", "A", "L", "WO", "H", "HP", "CO"];
var defaultPayrollRules = {
  standardWorkingDays: 26,
  pfRate: 0,
  esiRate: 0,
  professionalTax: 0,
  lwf: 0,
  overtimeHourlyRate: 0,
  paidLeave: 0,
  paidWeekOff: 0
};
var earningFields = [
  "basic",
  "da",
  "hra",
  "conveyance",
  "foodAllowance",
  "nightAllowance",
  "overtimeWages",
  "attendanceBonus",
  "arrears",
  "holidayWages",
  "sundayEarnings",
  "leaveWages",
  "roomAllowance",
  "productionIncentive",
  "medicalAllowance"
];
var deductionFields = [
  "pfDeduction",
  "esiDeduction",
  "professionalTax",
  "lwf",
  "canteen",
  "snacks",
  "tent",
  "advance",
  "otherDeduction",
  "tds",
  "medicalInsurance"
];
function roundMoney(value) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}
function numberValue(value) {
  if (typeof value === "string") value = value.replace(/[₹,\s]/g, "");
  const number = Number(value);
  return Number.isFinite(number) ? roundMoney(number) : 0;
}
function attendanceSummary(entries, rules) {
  const presentDays = entries.filter((entry) => entry.statusCode === "P" || entry.statusCode === "HP" || entry.statusCode === "CO").length + entries.filter((entry) => entry.statusCode === "HD").length * 0.5;
  const absentDays = entries.filter((entry) => entry.statusCode === "A").length + entries.filter((entry) => entry.statusCode === "HD").length * 0.5;
  const leaveDays = entries.filter((entry) => entry.statusCode === "L").length;
  const weekOffDays = entries.filter((entry) => entry.statusCode === "WO" || entry.statusCode === "H").length;
  const holidayPresentDays = entries.filter((entry) => entry.statusCode === "HP").length;
  const compOffDays = entries.filter((entry) => entry.statusCode === "CO").length;
  const overtimeHours = roundMoney(entries.reduce((sum, entry) => sum + numberValue(entry.overtimeHours), 0));
  const payableDays = presentDays + (rules.paidLeave ? leaveDays : 0) + (rules.paidWeekOff ? weekOffDays : 0);
  return { presentDays, absentDays, leaveDays, weekOffDays, holidayPresentDays, compOffDays, payableDays, overtimeHours };
}
function accommodationTotal(charge) {
  if (!charge) return { accommodationDeduction: 0, returnAmount: 0 };
  const fields = ["idCard", "rent", "bus", "medical", "ticket", "shoe", "advance", "food", "aadhaarUpdate", "bankAccountCharge", "tshirt", "oldPending", "gasShare", "rationShare", "provisionShare"];
  return {
    accommodationDeduction: roundMoney(fields.reduce((sum, field) => sum + numberValue(charge[field]), 0)),
    returnAmount: numberValue(charge.returnAmount)
  };
}
function payrollTotals(item) {
  const baseGross = numberValue(item.basic);
  const otWages = numberValue(item.overtimeWages);
  const additionalEarnings = roundMoney(
    numberValue(item.da) + numberValue(item.hra) + numberValue(item.conveyance) + numberValue(item.foodAllowance) + numberValue(item.nightAllowance) + numberValue(item.attendanceBonus) + numberValue(item.arrears) + numberValue(item.holidayWages) + numberValue(item.sundayEarnings) + numberValue(item.leaveWages) + numberValue(item.roomAllowance) + numberValue(item.productionIncentive) + numberValue(item.medicalAllowance)
  );
  const sumEarnings = roundMoney(earningFields.reduce((sum, field) => sum + numberValue(item[field]), 0));
  const importedGross = numberValue(item.importedGrossEarnings ?? item.sourceGrossEarnings);
  const computedEarnings = roundMoney(baseGross + otWages + additionalEarnings) || sumEarnings;
  const grossEarnings = importedGross > 0 ? importedGross : computedEarnings || importedGross;
  const statutoryDeductions = roundMoney(
    numberValue(item.pfDeduction) + numberValue(item.esiDeduction) + numberValue(item.professionalTax) + numberValue(item.lwf) + numberValue(item.tds)
  );
  const salaryDeductions = roundMoney(deductionFields.reduce((sum, field) => sum + numberValue(item[field]), 0));
  const importedDeductions = numberValue(item.importedTotalDeductions ?? item.sourceTotalDeductions);
  const hasDeductionsDiscrepancy = importedDeductions > 0 && salaryDeductions > 0 && Math.abs(salaryDeductions - importedDeductions) >= 0.01;
  const effectiveSalaryDeductions = importedDeductions > 0 && !hasDeductionsDiscrepancy ? importedDeductions : salaryDeductions;
  const accommodationDeduction = numberValue(item.accommodationDeduction);
  const returnAmount = numberValue(item.returnAmount);
  const totalDeductions = roundMoney(effectiveSalaryDeductions + accommodationDeduction);
  const importedNet = numberValue(item.importedNetPayable ?? item.sourceNetPayable);
  const calculatedNet = roundMoney(grossEarnings - totalDeductions + returnAmount);
  const hasEarningsDiscrepancy = importedGross > 0 && sumEarnings > 0 && Math.abs(sumEarnings - importedGross) >= 0.01;
  const rawNetPayable = importedNet > 0 && !hasDeductionsDiscrepancy && !hasEarningsDiscrepancy ? roundMoney(importedNet - accommodationDeduction + returnAmount) : calculatedNet;
  const hasMathDiscrepancy = importedGross > 0 && importedNet > 0 && importedNet !== calculatedNet;
  const netPayable = Math.max(0, rawNetPayable);
  const unrecoveredAmount = rawNetPayable < 0 ? roundMoney(Math.abs(rawNetPayable)) : 0;
  return {
    grossEarnings,
    statutoryDeductions,
    salaryDeductions: effectiveSalaryDeductions,
    totalDeductions,
    accommodationDeduction,
    returnAmount,
    netPayable,
    unrecoveredAmount,
    rawNetPayable,
    hasMathDiscrepancy,
    calculatedNet
  };
}
function validationForEmployee(employee, rules) {
  return {
    validationStatus: "ready",
    validationMessage: !employee.bankAccountMasked || !employee.ifscMasked ? "Cash payout (bank details pending)" : null
  };
}
function salaryForAttendance(salaryAmount, salaryBasis, payableDays, rules) {
  if (salaryBasis === "daily") return roundMoney(salaryAmount * payableDays);
  return roundMoney(salaryAmount / Math.max(1, rules.standardWorkingDays) * payableDays);
}

// supabase/functions/payroll-api/generated/access-control.ts
var ACCESS_MODULES = [
  { id: "dashboard", label: "Overview Dashboard", description: "Payroll totals, exceptions, and activity summary" },
  { id: "payroll", label: "Payroll Run", description: "Monthly salary calculations and payroll processing" },
  { id: "attendance", label: "Attendance", description: "Daily attendance, shift, week off, overtime, and remarks" },
  { id: "employees", label: "Employees", description: "Employee master, statutory, bank, and assignment details" },
  { id: "accommodation", label: "Accommodation", description: "Rooms, hostel recoveries, deductions, and return amounts" },
  { id: "payments", label: "Payments & Payslips", description: "Bank/cash outputs, payslips, and payment exports" },
  { id: "clients", label: "Clients & Employers", description: "Clients, employers, factory units, and status controls" },
  { id: "masters", label: "Operational Masters", description: "Accommodation types, shift timings, and reusable operational remarks" },
  { id: "operations", label: "Vehicle Monitoring", description: "Company vehicles, movements, fuel, expenses, and government/service reminders" },
  { id: "settings", label: "Rules & Settings", description: "Salary, statutory, overtime, attendance, and approval rules" },
  { id: "users", label: "Users & Access", description: "User profiles, roles, status, and permission customization" },
  { id: "vendor_desk", label: "Vendor Counter Desk", description: "Aadhaar verification, grocery bills, and receipt upload for stores" }
];
var allManage = Object.fromEntries(ACCESS_MODULES.map((module) => [module.id, "manage"]));
var DEFAULT_PERMISSIONS = {
  super_admin: allManage,
  payroll_team: {
    dashboard: "view",
    payroll: "manage",
    attendance: "view",
    employees: "view",
    accommodation: "manage",
    payments: "manage",
    clients: "view",
    masters: "view",
    operations: "view",
    settings: "view",
    users: "none",
    vendor_desk: "manage"
  },
  hr_team: {
    dashboard: "view",
    payroll: "view",
    attendance: "manage",
    employees: "manage",
    accommodation: "manage",
    payments: "none",
    clients: "view",
    masters: "manage",
    operations: "manage",
    settings: "none",
    users: "none",
    vendor_desk: "manage"
  },
  field_hr: {
    dashboard: "view",
    payroll: "view",
    attendance: "manage",
    employees: "manage",
    accommodation: "manage",
    payments: "none",
    clients: "view",
    masters: "view",
    operations: "view",
    settings: "none",
    users: "none",
    vendor_desk: "manage"
  },
  hostel_incharge: {
    dashboard: "view",
    payroll: "none",
    attendance: "manage",
    employees: "view",
    accommodation: "manage",
    payments: "none",
    clients: "view",
    masters: "view",
    operations: "none",
    settings: "none",
    users: "none",
    vendor_desk: "manage"
  },
  vendor: {
    dashboard: "none",
    payroll: "none",
    attendance: "none",
    employees: "none",
    accommodation: "none",
    payments: "none",
    clients: "none",
    masters: "none",
    operations: "none",
    settings: "none",
    users: "none",
    vendor_desk: "manage"
  }
};
function normalizeRole(value) {
  return value === "super_admin" || value === "payroll_team" || value === "hr_team" || value === "field_hr" || value === "hostel_incharge" || value === "vendor" ? value : "field_hr";
}
function normalizePermissions(role, value) {
  if (role === "super_admin") return { ...DEFAULT_PERMISSIONS.super_admin };
  const input = value && typeof value === "object" ? value : {};
  return Object.fromEntries(ACCESS_MODULES.map((module) => {
    const requested = input[module.id];
    return [module.id, requested === "manage" || requested === "view" || requested === "none" ? requested : DEFAULT_PERMISSIONS[role][module.id]];
  }));
}
function canView(permissions, module) {
  return permissions[module] === "view" || permissions[module] === "manage";
}
function canManage(permissions, module) {
  return permissions[module] === "manage";
}

// supabase/functions/payroll-api/generated/payroll-operations.ts
var DEFAULT_ACCOMMODATION_TYPES = [
  "Tamil / Own Accommodation",
  "Outside Room",
  "Joy Room"
];
function isOwnOrTamilAccommodation(val) {
  if (!val || typeof val !== "string") return true;
  const s = val.trim().toLowerCase();
  return s === "" || s === "none" || s === "own" || s === "tamil" || s === "tamil own" || s === "own accommodation" || s === "tamil accommodation" || s === "tamil / own accommodation" || s === "tamil / own" || s.includes("own") || s.includes("tamil");
}
function normalizeAccommodationType(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "Tamil / Own Accommodation";
  const lower = normalized.toLowerCase();
  if (lower === "tamil" || lower === "tamil own" || lower === "own" || lower === "own accommodation" || lower === "tamil / own accommodation" || lower === "tamil accommodation" || lower === "none") {
    return "Tamil / Own Accommodation";
  }
  if (lower === "joy" || lower === "joy hostel" || lower === "joy room") {
    return "Joy Room";
  }
  if (lower === "outside" || lower === "outside room" || lower === "outside hostel") {
    return "Outside Room";
  }
  return normalized;
}
function normalizedScope(value) {
  const parsed = typeof value === "string" ? parseScopeJson(value) : value;
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.filter((entry) => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()))].sort();
}
function parseScopeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
function calendarPeriod(period) {
  const [year, month] = period.split("-").map(Number);
  const start = `${period}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { start, end: `${period}-${String(lastDay).padStart(2, "0")}`, days: lastDay };
}
function payrollPeriodRange(period, periodStart, periodEnd) {
  const defaults = calendarPeriod(period);
  const start = periodStart || defaults.start;
  const inclusiveEnd = periodEnd || defaults.end;
  const startDate = /* @__PURE__ */ new Date(`${start}T00:00:00.000Z`);
  const endDate = /* @__PURE__ */ new Date(`${inclusiveEnd}T00:00:00.000Z`);
  const duration = Math.round((endDate.getTime() - startDate.getTime()) / 864e5) + 1;
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return { start, end: endDate.toISOString().slice(0, 10), inclusiveEnd, days: duration };
}
function splitMoneyEqually(amount, count) {
  if (!Number.isSafeInteger(count) || count < 1) return [];
  const pennies = Math.round(Math.max(0, amount) * 100);
  const base = Math.floor(pennies / count);
  const remainder = pennies % count;
  return Array.from({ length: count }, (_, index2) => (base + (index2 < remainder ? 1 : 0)) / 100);
}
function splitRoomExpenses(amounts, employeeIds) {
  const uniqueEmployees = [...new Set(employeeIds)].sort();
  const gas = splitMoneyEqually(amounts.gasAmount, uniqueEmployees.length);
  const ration = splitMoneyEqually(amounts.rationAmount, uniqueEmployees.length);
  const provision = splitMoneyEqually(amounts.provisionAmount, uniqueEmployees.length);
  const rent = splitMoneyEqually(amounts.roomRentAmount ?? 0, uniqueEmployees.length);
  const transport = splitMoneyEqually(amounts.transportRentAmount ?? 0, uniqueEmployees.length);
  return uniqueEmployees.map((employeeId, index2) => ({
    employeeId,
    gasShare: gas[index2],
    rationShare: ration[index2],
    provisionShare: provision[index2],
    rentShare: rent[index2],
    transportShare: transport[index2],
    total: Math.round(
      (gas[index2] + ration[index2] + provision[index2] + rent[index2] + transport[index2]) * 100
    ) / 100
  }));
}

// supabase/functions/payroll-api/generated/route.ts
var RequestError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
function errorMessages(error) {
  const messages = [];
  let current = error;
  while (current instanceof Error && messages.length < 4) {
    messages.push(current.message);
    current = "cause" in current ? current.cause : null;
  }
  return messages;
}
var RUN_ID = "RUN-AUG26-JMS-WAT1";
function isAutomatedSiteIdentity(email) {
  return /^sites-[a-z0-9-]+-noreply@chatgpt\.com$/i.test(email);
}
function parsePermissionJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
function appUserProfile(row) {
  const role = normalizeRole(row.role);
  const permissions = normalizePermissions(
    role,
    parsePermissionJson(row.permissionsJson)
  );
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    employeeCode: row.employeeCode,
    department: row.department,
    dateOfJoining: row.dateOfJoining,
    mobileNumber: row.mobileNumber,
    role,
    status: row.status,
    permissions,
    clientScope: normalizedScope(row.clientScopeJson),
    unitScope: normalizedScope(row.unitScopeJson),
    hostelScope: normalizedScope(row.hostelScopeJson),
    canApprovePayroll: role === "super_admin" || Boolean(row.canApprovePayroll),
    approvalManagerEmail: row.approvalManagerEmail,
    approvalSequence: row.approvalSequence,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt
  };
}
async function requireAppAccess(db, identity) {
  if (!identity)
    throw new RequestError(
      "Secure sign-in is required to access Joy Payroll Manager",
      401
    );
  return authenticateUser(db, identity);
}
async function authenticateUser(db, identity) {
  const email = identity.email.trim().toLowerCase();
  if (isAutomatedSiteIdentity(email))
    throw new RequestError(
      "Automated Site services cannot access confidential payroll records.",
      403
    );
  const isPermanentSuperAdmin = email === "praveen.red.07@gmail.com";
  let [row] = await db.select().from(appUsers).where(sql`lower(${appUsers.email}) = ${email}`).limit(1);
  if (!row) {
    const existingProfiles = await db.select().from(appUsers);
    const existingHuman = existingProfiles.find(
      (profile) => !isAutomatedSiteIdentity(profile.email)
    );
    if (!existingHuman || isPermanentSuperAdmin) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const values = {
        email,
        fullName: identity.fullName || (isPermanentSuperAdmin ? "Praveen B" : "Super Admin"),
        role: "super_admin",
        status: "active",
        permissionsJson: JSON.stringify(DEFAULT_PERMISSIONS.super_admin),
        canApprovePayroll: 1,
        createdBy: email,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      };
      await db.insert(appUsers).values({ id: isPermanentSuperAdmin ? "USER-JOY-PRIMARY-SUPER-ADMIN" : `USER-${crypto.randomUUID()}`, ...values }).onConflictDoNothing();
      [row] = await db.select().from(appUsers).where(sql`lower(${appUsers.email}) = ${email}`).limit(1);
    }
  }
  if (!row)
    throw new RequestError(
      "Your payroll access profile has not been created. Contact the Super Admin.",
      403
    );
  if (isPermanentSuperAdmin) {
    if (row.role !== "super_admin" || row.status !== "active" || !row.canApprovePayroll) {
      await db.update(appUsers).set({
        role: "super_admin",
        status: "active",
        canApprovePayroll: 1,
        permissionsJson: JSON.stringify(DEFAULT_PERMISSIONS.super_admin)
      }).where(eq(appUsers.id, row.id));
      row.role = "super_admin";
      row.status = "active";
      row.canApprovePayroll = 1;
    }
  }
  if (row.status !== "active")
    throw new RequestError(
      "Your payroll access profile is inactive. Contact the Super Admin.",
      403
    );
  const lastLoginAt = (/* @__PURE__ */ new Date()).toISOString();
  const shouldUpdateLogin = !row.lastLoginAt || Date.now() - new Date(row.lastLoginAt).getTime() > 5 * 60 * 1e3 || identity.fullName && identity.fullName !== row.fullName;
  if (shouldUpdateLogin) {
    await db.update(appUsers).set({ fullName: identity.fullName ?? row.fullName, lastLoginAt }).where(eq(appUsers.id, row.id));
  }
  return {
    identity,
    profile: appUserProfile({
      ...row,
      fullName: identity.fullName ?? row.fullName,
      lastLoginAt: shouldUpdateLogin ? lastLoginAt : row.lastLoginAt
    })
  };
}
function requireModule(access, module, level) {
  const allowed = level === "manage" ? canManage(access.profile.permissions, module) : canView(access.profile.permissions, module);
  if (!allowed)
    throw new RequestError(
      `Your ${access.profile.role.replaceAll("_", " ")} profile does not have ${level} access to ${ACCESS_MODULES.find((item) => item.id === module)?.label ?? module}.`,
      403
    );
}
function requireSuperAdmin(access, message = "Only a Super Admin can manage users and access profiles.") {
  if (access.profile.role !== "super_admin")
    throw new RequestError(message, 403);
}
function requireClientScope(access, vendorId) {
  if (access.profile.role === "super_admin") return;
  if (!access.profile.clientScope.includes(vendorId)) {
    throw new RequestError(
      "Your access profile does not include this client.",
      403
    );
  }
}
function requireUnitScope(access, unitId, vendorId) {
  requireClientScope(access, vendorId);
  if ((access.profile.role === "hr_team" || access.profile.role === "field_hr") && !access.profile.unitScope.includes(unitId)) {
    throw new RequestError(
      "Your HR access profile does not include this employer unit.",
      403
    );
  }
}
async function enforceActionScope(db, access, action, payload) {
  if (access.profile.role === "super_admin") return;
  if (access.profile.role === "hostel_incharge") {
    const allowed = /* @__PURE__ */ new Set([
      "save-attendance",
      "delete-attendance",
      "save-room-expense",
      "save-hostel-utility"
    ]);
    if (!allowed.has(action))
      throw new RequestError(
        "Hostel In-charge access is limited to assigned-hostel residents, attendance, and non-statutory hostel deductions",
        403
      );
    const hostelScope = new Set(access.profile.hostelScope);
    const employeeId2 = optionalValue(payload.employeeId);
    if (employeeId2) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId2)).limit(1);
      const [room] = employee?.roomId ? await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, employee.roomId)).limit(1) : [];
      if (!employee || !room?.hostelId || !hostelScope.has(room.hostelId))
        throw new RequestError(
          "This employee is not staying in your assigned hostel",
          403
        );
    }
    const roomId2 = optionalValue(payload.roomId);
    if (roomId2) {
      const [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, roomId2)).limit(1);
      if (!room?.hostelId || !hostelScope.has(room.hostelId))
        throw new RequestError("This room is not in your assigned hostel", 403);
    }
    return;
  }
  if (action === "create-vendor")
    throw new RequestError("Only a Super Admin can add a new client.", 403);
  const explicitVendor = optionalValue(payload.vendorId);
  if (explicitVendor) requireClientScope(access, explicitVendor);
  const explicitUnit = optionalValue(payload.unitId);
  if (explicitUnit) {
    const [unit] = await db.select().from(clientUnits).where(eq(clientUnits.id, explicitUnit)).limit(1);
    if (!unit) throw new RequestError("Employer unit not found", 404);
    requireUnitScope(access, unit.id, unit.vendorId);
  }
  const explicitRun = optionalValue(payload.runId);
  if (explicitRun) {
    const run = await requireRun(db, explicitRun);
    requireUnitScope(access, run.clientUnitId, run.vendorId);
  }
  const employeeId = optionalValue(payload.employeeId);
  if (employeeId) {
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
    if (!employee) throw new RequestError("Employee not found", 404);
    requireUnitScope(access, employee.clientUnitId, employee.vendorId);
  }
  const roomId = optionalValue(payload.roomId);
  if (roomId) {
    const [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, roomId)).limit(1);
    if (!room) throw new RequestError("Accommodation room not found", 404);
    requireClientScope(access, room.vendorId);
  }
  const entityId = optionalValue(payload.entityId) ?? ([
    "save-client",
    "save-unit",
    "save-shift",
    "save-remark",
    "save-accommodation-type",
    "save-room"
  ].includes(action) ? optionalValue(payload.id) : null);
  if (!entityId) return;
  const entityType = optionalValue(payload.entityType) ?? (action === "save-client" ? "client" : action === "save-unit" ? "unit" : action === "save-shift" ? "shift" : action === "save-remark" ? "remark" : action === "save-accommodation-type" ? "accommodation_type" : action === "save-room" ? "room" : "");
  if (entityType === "client") requireClientScope(access, entityId);
  else if (entityType === "unit") {
    const [unit] = await db.select().from(clientUnits).where(eq(clientUnits.id, entityId)).limit(1);
    if (unit) requireUnitScope(access, unit.id, unit.vendorId);
  } else if (entityType === "employee") {
    const [employee] = await db.select().from(employees).where(eq(employees.id, entityId)).limit(1);
    if (employee)
      requireUnitScope(access, employee.clientUnitId, employee.vendorId);
  } else if (entityType === "shift") {
    const [shift] = await db.select().from(shiftDefinitions).where(eq(shiftDefinitions.id, entityId)).limit(1);
    if (shift) requireClientScope(access, shift.vendorId);
  } else if (entityType === "remark") {
    const [remark] = await db.select().from(payrollRemarks).where(eq(payrollRemarks.id, entityId)).limit(1);
    if (remark) requireClientScope(access, remark.vendorId);
  } else if (entityType === "accommodation_type") {
    const [type] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, entityId)).limit(1);
    if (type) requireClientScope(access, type.vendorId);
  } else if (entityType === "room") {
    const [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, entityId)).limit(1);
    if (room) requireClientScope(access, room.vendorId);
  }
}
function actionPermission(action, payload) {
  if (action === "save-own-profile") return null;
  if ([
    "create-staff-task",
    "update-staff-task",
    "delete-staff-task",
    "send-task-whatsapp-reminder",
    "trigger-due-task-reminders"
  ].includes(action))
    return null;
  if (action === "save-app-user" || (action === "set-record-status" || action === "delete-record") && payload.entityType === "app_user")
    return { module: "users", level: "manage" };
  if (["create-vendor", "save-client", "create-unit", "save-unit", "update-unit-scope"].includes(
    action
  ) || (action === "set-record-status" || action === "delete-record") && ["client", "unit"].includes(String(payload.entityType)))
    return { module: "clients", level: "manage" };
  if (action === "save-employee")
    return { module: "employees", level: "view" };
  if ([
    "mark-employee-left",
    "reactivate-employee",
    "advance-employee-workflow",
    "delete-employee",
    "delete-employees"
  ].includes(action) || (action === "set-record-status" || action === "delete-record") && payload.entityType === "employee")
    return { module: "employees", level: "manage" };
  if (["save-shift", "save-remark", "save-accommodation-type"].includes(action) || (action === "set-record-status" || action === "delete-record") && ["shift", "remark", "accommodation_type"].includes(
    String(payload.entityType)
  ))
    return { module: "masters", level: "manage" };
  if (["save-attendance", "delete-attendance"].includes(action))
    return { module: "attendance", level: "manage" };
  if (action === "save-recovery-entry")
    return { module: "vendor_desk", level: "manage" };
  if ([
    "save-accommodation",
    "delete-accommodation",
    "delete-recovery-entry",
    "finalize-employee-recovery",
    "reopen-employee-recovery",
    "save-room",
    "allocate-room",
    "save-room-expense",
    "finalize-room-expense",
    "reopen-room-expense"
  ].includes(action) || (action === "set-record-status" || action === "delete-record") && payload.entityType === "room")
    return { module: "accommodation", level: "manage" };
  if ([
    "clear-payroll-batch",
    "reopen-payroll-batch",
    "lock-payment-batch",
    "unlock-payment-batch",
    "download-payment-batch"
  ].includes(action))
    return { module: "payments", level: "manage" };
  if ([
    "save-vehicle",
    "save-vehicle-record",
    "save-utility-meter",
    "save-eb-reading",
    "approve-operation-record"
  ].includes(action))
    return { module: "operations", level: "manage" };
  if ([
    "save-hostel",
    "delete-hostel",
    "assign-room-hostel",
    "save-hostel-utility",
    "approve-hostel-utility"
  ].includes(action))
    return { module: "accommodation", level: "manage" };
  if (action === "save-rules") return { module: "settings", level: "manage" };
  if (action === "import-workbook")
    return {
      module: payload.sourceType === "salary" ? "payroll" : payload.sourceType === "csv" ? "employees" : "attendance",
      level: "manage"
    };
  if ([
    "create-run",
    "update-run-period",
    "set-run-processing-mode",
    "prepare-payroll-batch",
    "prepare-payroll-batches",
    "save-payroll-item",
    "resolve-issues",
    "recalculate",
    "reopen",
    "reopen-payroll-for-recovery",
    "reset-demo",
    "delete-payroll-run"
  ].includes(action))
    return { module: "payroll", level: "manage" };
  return null;
}
async function createDefaultShifts(db, vendorId) {
  await db.insert(shiftDefinitions).values([
    {
      id: `SHIFT-${crypto.randomUUID()}`,
      vendorId,
      name: "General",
      startTime: "09:00",
      endTime: "18:00"
    },
    {
      id: `SHIFT-${crypto.randomUUID()}`,
      vendorId,
      name: "1st Shift",
      startTime: "06:00",
      endTime: "14:00"
    },
    {
      id: `SHIFT-${crypto.randomUUID()}`,
      vendorId,
      name: "2nd Shift",
      startTime: "14:00",
      endTime: "22:00"
    },
    {
      id: `SHIFT-${crypto.randomUUID()}`,
      vendorId,
      name: "3rd Shift",
      startTime: "22:00",
      endTime: "06:00"
    }
  ]);
}
async function createDefaultAccommodationTypes(db, vendorId) {
  await db.insert(accommodationTypes).values(
    DEFAULT_ACCOMMODATION_TYPES.map((name) => ({
      id: `ACCTYPE-${crypto.randomUUID()}`,
      vendorId,
      name
    }))
  );
}
async function loadAppData(access) {
  const db = getDb();
  const [
    allVendorRows,
    allUnitRows,
    allEmployeeRows,
    allRunRows,
    allItemRows,
    allAttendanceRows,
    allChargeRows,
    allRecoveryRows,
    allRecoveryFinalizationRows,
    allAuditRows,
    allRuleRows,
    allShiftRows,
    allRemarkRows,
    userRows,
    allTypeRows,
    allRoomRows,
    allRoomExpenseRows,
    allBatchRows,
    allPaymentExportBatchRows,
    allPaymentExportBatchItemRows,
    allVehicles,
    allVehicleRecords,
    allMeters,
    allEbReadings,
    allHostels,
    allHostelReadings,
    allAppDocumentRows,
    allStaffTasks
  ] = await Promise.all([
    db.select().from(vendors).orderBy(asc(vendors.name)),
    db.select().from(clientUnits).orderBy(asc(clientUnits.clientName)),
    db.select({
      id: employees.id,
      vendorId: employees.vendorId,
      clientUnitId: employees.clientUnitId,
      employeeCode: employees.employeeCode,
      name: employees.name,
      department: employees.department,
      dateOfJoining: employees.dateOfJoining,
      dateOfBirth: employees.dateOfBirth,
      dateOfLeaving: employees.dateOfLeaving,
      finalPayrollMonth: employees.finalPayrollMonth,
      uanMasked: employees.uanMasked,
      esiMasked: employees.esiMasked,
      bankAccountMasked: employees.bankAccountMasked,
      ifscMasked: employees.ifscMasked,
      bankName: employees.bankName,
      bankBranch: employees.bankBranch,
      accommodationType: employees.accommodationType,
      roomId: employees.roomId,
      roomNumber: employees.roomNumber,
      roomRentAmount: employees.roomRentAmount,
      photoDataUrl: sql`NULL`,
      mobileNumber: employees.mobileNumber,
      emailAddress: employees.emailAddress,
      emergencyContactNumber: employees.emergencyContactNumber,
      addressLine: employees.addressLine,
      district: employees.district,
      stateName: employees.stateName,
      pincode: employees.pincode,
      bloodGroup: employees.bloodGroup,
      gender: employees.gender,
      fatherName: employees.fatherName,
      spouseName: employees.spouseName,
      maritalStatus: employees.maritalStatus,
      highestQualification: employees.highestQualification,
      applicationJson: employees.applicationJson,
      pfApplicable: employees.pfApplicable,
      pfWageAmount: employees.pfWageAmount,
      esiApplicable: employees.esiApplicable,
      esiWageAmount: employees.esiWageAmount,
      ptApplicable: employees.ptApplicable,
      lwfApplicable: employees.lwfApplicable,
      paymentMode: employees.paymentMode,
      salaryAmount: employees.salaryAmount,
      salaryBasis: employees.salaryBasis,
      defaultShift: employees.defaultShift,
      shiftPattern: employees.shiftPattern,
      applicableShiftsJson: employees.applicableShiftsJson,
      remarks: employees.remarks,
      complianceStatus: employees.complianceStatus,
      status: employees.status,
      employmentType: employees.employmentType,
      processingStage: employees.processingStage,
      finalizedBy: employees.finalizedBy,
      finalizedAt: employees.finalizedAt
    }).from(employees).orderBy(asc(employees.employeeCode)),
    db.select().from(payrollRuns).orderBy(asc(payrollRuns.payPeriod)),
    db.select({
      id: payrollItems.id,
      runId: payrollItems.runId,
      employeeId: payrollItems.employeeId,
      employeeCode: employees.employeeCode,
      employeeName: employees.name,
      department: employees.department,
      accommodationType: employees.accommodationType,
      roomNumber: employees.roomNumber,
      paymentMode: employees.paymentMode,
      bankAccountMasked: employees.bankAccountMasked,
      ifscMasked: employees.ifscMasked,
      complianceStatus: employees.complianceStatus,
      presentDays: payrollItems.presentDays,
      absentDays: payrollItems.absentDays,
      leaveDays: payrollItems.leaveDays,
      weekOffDays: payrollItems.weekOffDays,
      holidayPresentDays: payrollItems.holidayPresentDays,
      payableDays: payrollItems.payableDays,
      overtimeHours: payrollItems.overtimeHours,
      salaryBasis: employees.salaryBasis,
      fixedWorkingDays: payrollItems.fixedWorkingDays,
      nfhDays: payrollItems.nfhDays,
      compOffDays: payrollItems.compOffDays,
      onDutyDays: payrollItems.onDutyDays,
      sundayDays: payrollItems.sundayDays,
      plDays: payrollItems.plDays,
      clDays: payrollItems.clDays,
      slDays: payrollItems.slDays,
      importedGrossEarnings: payrollItems.importedGrossEarnings,
      importedTotalDeductions: payrollItems.importedTotalDeductions,
      importedNetPayable: payrollItems.importedNetPayable,
      basic: payrollItems.basic,
      da: payrollItems.da,
      hra: payrollItems.hra,
      conveyance: payrollItems.conveyance,
      foodAllowance: payrollItems.foodAllowance,
      nightAllowance: payrollItems.nightAllowance,
      overtimeWages: payrollItems.overtimeWages,
      attendanceBonus: payrollItems.attendanceBonus,
      arrears: payrollItems.arrears,
      holidayWages: payrollItems.holidayWages,
      sundayEarnings: payrollItems.sundayEarnings,
      leaveWages: payrollItems.leaveWages,
      roomAllowance: payrollItems.roomAllowance,
      productionIncentive: payrollItems.productionIncentive,
      medicalAllowance: payrollItems.medicalAllowance,
      pfDeduction: payrollItems.pfDeduction,
      esiDeduction: payrollItems.esiDeduction,
      professionalTax: payrollItems.professionalTax,
      lwf: payrollItems.lwf,
      canteen: payrollItems.canteen,
      snacks: payrollItems.snacks,
      tent: payrollItems.tent,
      advance: payrollItems.advance,
      otherDeduction: payrollItems.otherDeduction,
      tds: payrollItems.tds,
      medicalInsurance: payrollItems.medicalInsurance,
      accommodationDeduction: payrollItems.accommodationDeduction,
      returnAmount: payrollItems.returnAmount,
      grossEarnings: payrollItems.grossEarnings,
      totalDeductions: payrollItems.totalDeductions,
      netPayable: payrollItems.netPayable,
      validationStatus: payrollItems.validationStatus,
      validationMessage: payrollItems.validationMessage
    }).from(payrollItems).innerJoin(employees, eq(payrollItems.employeeId, employees.id)).orderBy(asc(employees.employeeCode)),
    db.select().from(attendanceEntries).where(gte(attendanceEntries.attendanceDate, (() => {
      const d = /* @__PURE__ */ new Date();
      d.setMonth(d.getMonth() - 2);
      return d.toISOString().slice(0, 10);
    })())).orderBy(
      asc(attendanceEntries.attendanceDate),
      asc(attendanceEntries.employeeId)
    ),
    db.select().from(accommodationCharges).orderBy(asc(accommodationCharges.roomNumber)),
    db.select().from(recoveryEntries).orderBy(
      desc(recoveryEntries.recoveryDate),
      desc(recoveryEntries.createdAt)
    ),
    db.select().from(recoveryFinalizations).orderBy(desc(recoveryFinalizations.finalizedAt)),
    db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(30),
    db.select().from(payrollRules).orderBy(asc(payrollRules.vendorId)),
    db.select().from(shiftDefinitions).orderBy(asc(shiftDefinitions.name)),
    db.select().from(payrollRemarks).orderBy(asc(payrollRemarks.category), asc(payrollRemarks.title)),
    db.select().from(appUsers).orderBy(asc(appUsers.fullName), asc(appUsers.email)),
    db.select().from(accommodationTypes).orderBy(asc(accommodationTypes.name)),
    db.select().from(accommodationRooms).orderBy(asc(accommodationRooms.roomNumber)),
    db.select().from(accommodationRoomExpenses).orderBy(desc(accommodationRoomExpenses.payPeriod)),
    db.select().from(payrollBatches).orderBy(asc(payrollBatches.accommodationType)),
    db.select().from(paymentExportBatches).orderBy(desc(paymentExportBatches.lockedAt)),
    db.select().from(paymentExportBatchItems).orderBy(asc(paymentExportBatchItems.createdAt)),
    db.select().from(vehicles).orderBy(asc(vehicles.registrationNumber)),
    db.select().from(vehicleRecords).orderBy(desc(vehicleRecords.recordDate)),
    db.select().from(utilityMeters).orderBy(asc(utilityMeters.locationName)),
    db.select().from(ebReadings).orderBy(desc(ebReadings.readingDate)),
    db.select().from(hostels).orderBy(asc(hostels.name)),
    db.select().from(hostelUtilityReadings).orderBy(desc(hostelUtilityReadings.readingDate)),
    db.select({
      id: applicationDocuments.id,
      employeeId: applicationDocuments.employeeId,
      category: applicationDocuments.category,
      filename: applicationDocuments.filename,
      status: applicationDocuments.status,
      rejectionReason: applicationDocuments.rejectionReason,
      reviewedBy: applicationDocuments.reviewedBy,
      reviewedAt: applicationDocuments.reviewedAt
    }).from(applicationDocuments),
    db.select().from(staffTasks).orderBy(desc(staffTasks.createdAt))
  ]);
  const unrestricted = access.profile.role === "super_admin";
  const clientScope = new Set(access.profile.clientScope);
  const unitScope = new Set(access.profile.unitScope);
  const hostelScope = new Set(access.profile.hostelScope);
  const isVendorUser = access.profile.role === "vendor";
  const vendorRows = unrestricted || isVendorUser && clientScope.size === 0 ? allVendorRows : allVendorRows.filter((vendor) => clientScope.has(vendor.id));
  const visibleVendorIds = new Set(vendorRows.map((vendor) => vendor.id));
  const unitRows = allUnitRows.filter(
    (unit) => visibleVendorIds.has(unit.vendorId) && (unrestricted || isVendorUser || !["hr_team", "field_hr"].includes(access.profile.role) || unitScope.has(unit.id))
  );
  const visibleUnitIds = new Set(unitRows.map((unit) => unit.id));
  const assignedHostelRoomIds = new Set(
    allRoomRows.filter((room) => room.hostelId && hostelScope.has(room.hostelId)).map((room) => room.id)
  );
  const employeeRows = allEmployeeRows.filter(
    (employee) => visibleVendorIds.has(employee.vendorId) && visibleUnitIds.has(employee.clientUnitId) && (access.profile.role !== "hostel_incharge" || Boolean(employee.roomId && assignedHostelRoomIds.has(employee.roomId)))
  );
  const visibleEmployeeIds = new Set(
    employeeRows.map((employee) => employee.id)
  );
  const runRows = allRunRows.filter(
    (run) => visibleVendorIds.has(run.vendorId) && visibleUnitIds.has(run.clientUnitId)
  );
  const visibleRunIds = new Set(runRows.map((run) => run.id));
  const itemRows = isVendorUser ? [] : allItemRows.filter(
    (item) => visibleRunIds.has(item.runId) && visibleEmployeeIds.has(item.employeeId)
  );
  const attendanceRows = isVendorUser ? [] : allAttendanceRows.filter(
    (entry) => visibleEmployeeIds.has(entry.employeeId)
  );
  const chargeRows = allChargeRows.filter(
    (charge) => visibleRunIds.has(charge.runId) && visibleEmployeeIds.has(charge.employeeId)
  );
  const recoveryRows = allRecoveryRows.filter(
    (entry) => visibleRunIds.has(entry.runId) && visibleEmployeeIds.has(entry.employeeId)
  );
  const recoveryFinalizationRows = allRecoveryFinalizationRows.filter(
    (entry) => visibleRunIds.has(entry.runId) && visibleEmployeeIds.has(entry.employeeId)
  );
  const auditRows = unrestricted ? allAuditRows : allAuditRows.filter(
    (event) => event.actorEmail?.toLowerCase() === access.identity.email.toLowerCase()
  );
  const ruleRows = allRuleRows.filter(
    (rule) => visibleVendorIds.has(rule.vendorId)
  );
  const shiftRows = allShiftRows.filter(
    (shift) => visibleVendorIds.has(shift.vendorId)
  );
  const remarkRows = allRemarkRows.filter(
    (remark) => visibleVendorIds.has(remark.vendorId)
  );
  const typeRows = allTypeRows.filter(
    (type) => visibleVendorIds.has(type.vendorId)
  );
  const roomRows = allRoomRows.filter((room) => {
    if (!visibleVendorIds.has(room.vendorId)) return false;
    if (access.profile.role === "hostel_incharge")
      return Boolean(room.hostelId && hostelScope.has(room.hostelId));
    if (unrestricted || access.profile.role !== "hr_team") return true;
    const occupants = allEmployeeRows.filter(
      (employee) => employee.roomId === room.id && employee.status === "active"
    );
    return occupants.length === 0 || occupants.some((employee) => visibleEmployeeIds.has(employee.id));
  });
  const visibleRoomIds = new Set(roomRows.map((room) => room.id));
  const roomExpenseRows = allRoomExpenseRows.filter(
    (expense) => visibleRoomIds.has(expense.roomId)
  );
  const batchRows = allBatchRows.filter(
    (batch) => visibleRunIds.has(batch.runId)
  );
  const paymentExportBatchRows = allPaymentExportBatchRows.filter(
    (batch) => visibleRunIds.has(batch.runId)
  );
  const visiblePaymentExportBatchIds = new Set(
    paymentExportBatchRows.map((batch) => batch.id)
  );
  const paymentExportBatchItemRows = allPaymentExportBatchItemRows.filter(
    (item) => visibleRunIds.has(item.runId) && visibleEmployeeIds.has(item.employeeId) && visiblePaymentExportBatchIds.has(item.batchId)
  );
  const permissions = access.profile.permissions;
  const seesAny = (modules) => modules.some((module) => canView(permissions, module));
  const seesOrganisation = seesAny([
    "dashboard",
    "payroll",
    "attendance",
    "employees",
    "accommodation",
    "payments",
    "clients",
    "masters",
    "settings"
  ]);
  const seesEmployees = seesAny([
    "dashboard",
    "payroll",
    "attendance",
    "employees",
    "accommodation",
    "payments"
  ]);
  const seesFullEmployeeDetails = access.profile.role !== "hostel_incharge" && seesAny(["dashboard", "payroll", "employees", "payments"]);
  const seesRuns = seesAny([
    "dashboard",
    "payroll",
    "attendance",
    "accommodation",
    "payments"
  ]);
  const seesPayrollItems = seesRuns;
  const seesFullPayrollDetails = seesAny(["payroll", "payments"]);
  const seesPayrollSummaryMoney = seesAny(["dashboard", "accommodation"]);
  const seesRunMoney = seesAny([
    "dashboard",
    "payroll",
    "accommodation",
    "payments"
  ]);
  const visibleEmployees = !seesEmployees ? [] : seesFullEmployeeDetails ? employeeRows : employeeRows.map((employee) => ({
    ...employee,
    uanMasked: null,
    esiMasked: null,
    bankAccountMasked: null,
    ifscMasked: null,
    bankName: null,
    salaryAmount: 0,
    salaryBasis: "monthly",
    paymentMode: "bank",
    complianceStatus: "ready"
  }));
  const visibleRuns = !seesRuns ? [] : seesRunMoney ? runRows : runRows.map((run) => ({
    ...run,
    grossEarnings: 0,
    statutoryDeductions: 0,
    otherDeductions: 0,
    accommodationDeductions: 0,
    netPayable: 0,
    bankPayable: 0,
    cashPayable: 0,
    issueCount: 0,
    approvedBy: null
  }));
  const visibleItems = !seesPayrollItems ? [] : itemRows.map((item) => {
    if (seesFullPayrollDetails) return item;
    const redacted = { ...item };
    for (const field of [...earningFields, ...deductionFields])
      redacted[field] = 0;
    redacted.bankAccountMasked = null;
    redacted.ifscMasked = null;
    redacted.paymentMode = "cash";
    if (!seesPayrollSummaryMoney) {
      redacted.accommodationDeduction = 0;
      redacted.returnAmount = 0;
      redacted.grossEarnings = 0;
      redacted.totalDeductions = 0;
      redacted.netPayable = 0;
    }
    if (!canView(permissions, "dashboard")) {
      redacted.validationStatus = "ready";
      redacted.validationMessage = null;
    }
    return redacted;
  });
  return {
    demo: vendorRows.every(
      (vendor) => vendor.id === "vendor-jms" || vendor.id === "vendor-jcs"
    ),
    vendors: seesOrganisation ? vendorRows : [],
    units: seesOrganisation ? unitRows : [],
    employees: visibleEmployees,
    runs: visibleRuns,
    payrollItems: visibleItems,
    attendance: canView(permissions, "attendance") ? attendanceRows : [],
    accommodationCharges: canView(permissions, "accommodation") ? chargeRows : [],
    recoveryEntries: canView(permissions, "accommodation") ? recoveryRows : [],
    recoveryFinalizations: canView(permissions, "accommodation") ? recoveryFinalizationRows : [],
    accommodationTypes: seesAny([
      "masters",
      "accommodation",
      "employees",
      "payroll",
      "payments"
    ]) ? typeRows : [],
    accommodationRooms: seesAny(["accommodation", "employees", "payroll"]) ? roomRows : [],
    roomExpenses: canView(permissions, "accommodation") ? roomExpenseRows : [],
    payrollBatches: seesAny(["payroll", "payments", "accommodation"]) ? batchRows : [],
    paymentExportBatches: seesAny(["payroll", "payments"]) ? paymentExportBatchRows : [],
    paymentExportBatchItems: seesAny(["payroll", "payments"]) ? paymentExportBatchItemRows : [],
    auditEvents: seesAny(["dashboard", "users"]) ? auditRows.reverse() : [],
    rules: canView(permissions, "settings") ? ruleRows : [],
    shifts: seesAny(["masters", "attendance", "employees"]) ? shiftRows : [],
    remarks: seesAny(["clients", "masters", "attendance", "employees"]) ? remarkRows : [],
    currentUser: access.profile,
    appUsers: userRows.map(appUserProfile),
    vehicles: canView(permissions, "operations") ? allVehicles.filter((vehicle) => visibleVendorIds.has(vehicle.vendorId)) : [],
    vehicleRecords: canView(permissions, "operations") ? allVehicleRecords.filter(
      (record) => allVehicles.some(
        (vehicle) => vehicle.id === record.vehicleId && visibleVendorIds.has(vehicle.vendorId)
      )
    ) : [],
    utilityMeters: canView(permissions, "operations") ? allMeters.filter((meter) => visibleVendorIds.has(meter.vendorId)) : [],
    ebReadings: canView(permissions, "operations") ? allEbReadings.filter(
      (reading) => allMeters.some(
        (meter) => meter.id === reading.meterId && visibleVendorIds.has(meter.vendorId)
      )
    ) : [],
    hostels: canView(permissions, "accommodation") ? allHostels.filter((hostel) => {
      if (access.profile.role === "hostel_incharge") return hostelScope.has(hostel.id);
      if (unrestricted) return true;
      let mappedUnits = [];
      try {
        const parsed = JSON.parse(hostel.clientScopeJson || "[]");
        if (Array.isArray(parsed)) mappedUnits = parsed;
      } catch {
      }
      return visibleVendorIds.has(hostel.vendorId) || mappedUnits.some((unitId) => visibleUnitIds.has(unitId));
    }) : [],
    hostelUtilityReadings: canView(permissions, "accommodation") ? allHostelReadings.filter(
      (reading) => allHostels.some(
        (hostel) => hostel.id === reading.hostelId && visibleVendorIds.has(hostel.vendorId)
      )
    ) : [],
    applicationDocuments: allAppDocumentRows.filter(
      (doc) => visibleEmployeeIds.has(doc.employeeId)
    ),
    tasks: allStaffTasks
  };
}
async function GET(identity) {
  try {
    const db = getDb();
    const access = await requireAppAccess(db, identity);
    return Response.json(await loadAppData(access));
  } catch (error) {
    const messages = errorMessages(error);
    const status = error instanceof RequestError ? error.status : 500;
    const safeMessage = error instanceof RequestError ? error.message : messages.at(-1) ?? "Unable to load payroll data";
    if (status >= 500)
      console.error(
        "Payroll application data failed to load",
        safeMessage.split("\n")[0]
      );
    return Response.json({ error: safeMessage }, { status });
  }
}
function textValue(value, label) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new RequestError(`${label} is required`);
  return result;
}
function optionalValue(value) {
  if (value === null || value === void 0) return null;
  const result = String(value).trim();
  return result || null;
}
function requiredStringArray(value, label, maximum = 500) {
  if (!Array.isArray(value))
    throw new RequestError(`${label} must be a list of employee selections`);
  const values = [
    ...new Set(
      value.filter((entry) => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
    )
  ];
  if (!values.length) throw new RequestError(`Select at least one ${label}`);
  if (values.length > maximum)
    throw new RequestError(
      `${label} cannot contain more than ${maximum} employees`
    );
  return values;
}
function mutationChangedRows(result) {
  if (!result || typeof result !== "object") return null;
  const candidate = result;
  const d1Changes = candidate.meta?.changes;
  if (typeof d1Changes === "number" && Number.isFinite(d1Changes))
    return d1Changes;
  if (typeof candidate.count === "number" && Number.isFinite(candidate.count))
    return candidate.count;
  return null;
}
async function downloadedPayrollItemIds(db, runId) {
  const rows = await db.select({ payrollItemId: paymentExportBatchItems.payrollItemId }).from(paymentExportBatchItems).innerJoin(
    paymentExportBatches,
    eq(paymentExportBatchItems.batchId, paymentExportBatches.id)
  ).where(
    and(
      eq(paymentExportBatchItems.runId, runId),
      eq(paymentExportBatches.status, "downloaded")
    )
  );
  return new Set(rows.map((row) => row.payrollItemId));
}
async function requirePayrollItemPaymentUnlocked(db, runId, payrollItemId) {
  const downloadedIds = await downloadedPayrollItemIds(db, runId);
  if (downloadedIds.has(payrollItemId))
    throw new RequestError(
      "This employee is locked because their bank file was already downloaded. Edit only the newly added employee salary record.",
      409
    );
}
function positiveValue(value, label, maximum = 1e8) {
  const result = numberValue(value);
  if (result < 0 || result > maximum)
    throw new RequestError(`${label} must be between 0 and ${maximum}`);
  return result;
}
function periodValue(value) {
  const result = textValue(value, "Payroll month");
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(result))
    throw new RequestError("Payroll month must be YYYY-MM");
  return result;
}
function periodRange(period, periodStart, periodEnd) {
  return payrollPeriodRange(period, periodStart, periodEnd);
}
function dateValue(value, label) {
  const result = textValue(value, label);
  const parsed = /* @__PURE__ */ new Date(`${result}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) {
    throw new RequestError(`${label} must be a valid YYYY-MM-DD date`);
  }
  return result;
}
function runPeriodValues(period, payload, defaultWorkingDays) {
  const defaults = periodRange(period);
  const periodStart = payload.periodStart ? dateValue(payload.periodStart, "Payroll period start") : defaults.start;
  const periodEnd = payload.periodEnd ? dateValue(payload.periodEnd, "Payroll period end") : defaults.inclusiveEnd;
  const range = periodRange(period, periodStart, periodEnd);
  if (range.days < 1 || range.days > 62)
    throw new RequestError(
      "The selected payroll period must cover between 1 and 62 calendar days"
    );
  const workingDays = payload.workingDays === void 0 || payload.workingDays === null || payload.workingDays === "" ? Math.min(defaultWorkingDays, range.days) : positiveValue(payload.workingDays, "Payroll working days", 62);
  if (!Number.isInteger(workingDays) || workingDays < 1 || workingDays > range.days) {
    throw new RequestError(
      `Payroll working days must be a whole number between 1 and ${range.days}`
    );
  }
  return { periodStart, periodEnd, workingDays };
}
function unitCycleRange(period, startDay, endDay) {
  const [year, month] = period.split("-").map(Number);
  const dayInMonth = (targetYear, targetMonth, day) => {
    const maximum = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
    return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(Math.min(day, maximum)).padStart(2, "0")}`;
  };
  if (startDay <= endDay)
    return {
      periodStart: dayInMonth(year, month, startDay),
      periodEnd: dayInMonth(year, month, endDay)
    };
  const previous = new Date(Date.UTC(year, month - 2, 1));
  return {
    periodStart: dayInMonth(
      previous.getUTCFullYear(),
      previous.getUTCMonth() + 1,
      startDay
    ),
    periodEnd: dayInMonth(year, month, endDay)
  };
}
function selectedPayslipFields(value, allowed, label) {
  const values = value === void 0 || value === null ? [...allowed] : Array.isArray(value) ? value.map(String) : typeof value === "string" && value ? value.split(",") : [];
  const selected = [
    ...new Set(values.filter((field) => allowed.includes(field)))
  ];
  if (!selected.length)
    throw new RequestError(`Select at least one ${label} field`);
  return JSON.stringify(selected);
}
async function activeRules(db, vendorId) {
  const [rule] = await db.select().from(payrollRules).where(eq(payrollRules.vendorId, vendorId)).limit(1);
  return { ...defaultPayrollRules, ...rule };
}
async function requireRun(db, runId, editable = false) {
  const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, runId)).limit(1);
  if (!run) throw new RequestError("Payroll run not found", 404);
  if (editable && run.status === "approved")
    throw new RequestError(
      "This payroll run is approved. Reopen it before making changes.",
      409
    );
  return run;
}
async function writeAudit(db, action, entityType, entityId, summary, actorEmail) {
  await db.insert(auditEvents).values({ action, entityType, entityId, summary, actorEmail });
}
async function recalculateRun(db, runId, recomputeAttendance = false, targetEmployeeId) {
  const run = await requireRun(db, runId);
  const isSalaryImport = run.processingMode === "salary_import";
  const { start, end } = periodRange(
    run.payPeriod,
    run.periodStart,
    run.periodEnd
  );
  const [rows, unitEmployees, periodAttendance, charges, rules, unitRows] = await Promise.all([
    db.select().from(payrollItems).where(eq(payrollItems.runId, runId)),
    db.select().from(employees).where(eq(employees.clientUnitId, run.clientUnitId)),
    db.select().from(attendanceEntries).where(
      and(
        gte(attendanceEntries.attendanceDate, start),
        lt(attendanceEntries.attendanceDate, end)
      )
    ),
    db.select().from(accommodationCharges).where(eq(accommodationCharges.runId, runId)),
    activeRules(db, run.vendorId),
    db.select().from(clientUnits).where(eq(clientUnits.id, run.clientUnitId)).limit(1)
  ]);
  const overtimeMultiplier = unitRows[0]?.overtimeMultiplier ?? 1;
  const effectiveRules = {
    ...rules,
    standardWorkingDays: run.workingDays || rules.standardWorkingDays
  };
  const employeeMap = new Map(
    unitEmployees.map((employee) => [employee.id, employee])
  );
  const chargeMap = new Map(
    charges.map((charge) => [charge.employeeId, charge])
  );
  const attendanceMap = /* @__PURE__ */ new Map();
  for (const entry of periodAttendance) {
    const collection = attendanceMap.get(entry.employeeId) ?? [];
    collection.push(entry);
    attendanceMap.set(entry.employeeId, collection);
  }
  const updatedRows = [];
  const itemUpdateTasks = [];
  const empUpdateTasks = [];
  for (const row of rows) {
    const employee = employeeMap.get(row.employeeId);
    if (!employee) continue;
    if (targetEmployeeId && row.employeeId !== targetEmployeeId) {
      updatedRows.push({
        ...row,
        paymentMode: employee.paymentMode,
        bankAccountMasked: employee.bankAccountMasked,
        ifscMasked: employee.ifscMasked
      });
      continue;
    }
    const entries = attendanceMap.get(employee.id) ?? [];
    const isUnchangedDemo = run.id === RUN_ID && entries.length > 0 && entries.every((entry) => entry.source === "demo");
    const hasImportedSalary = isSalaryImport && ((row.importedGrossEarnings || 0) > 0 || (row.importedNetPayable || 0) > 0 || (row.grossEarnings || 0) > 0);
    const shouldRecomputeAttendance = (recomputeAttendance || row.presentDays === 0) && entries.length > 0 && !isUnchangedDemo;
    const shouldRecomputeWages = recomputeAttendance && entries.length > 0 && !isUnchangedDemo && !hasImportedSalary;
    const next = { ...row };
    if (shouldRecomputeAttendance) {
      Object.assign(next, attendanceSummary(entries, effectiveRules));
    }
    if (shouldRecomputeWages) {
      if (employee.salaryAmount > 0)
        next.basic = salaryForAttendance(
          employee.salaryAmount,
          employee.salaryBasis,
          next.payableDays,
          effectiveRules
        );
      if (effectiveRules.overtimeHourlyRate > 0)
        next.overtimeWages = roundMoney(
          next.overtimeHours * overtimeMultiplier * effectiveRules.overtimeHourlyRate
        );
      if (effectiveRules.pfRate > 0)
        next.pfDeduction = employee.pfApplicable ? roundMoney(
          Math.min(employee.pfWageAmount || next.basic, 15e3) * effectiveRules.pfRate / 100
        ) : 0;
      if (effectiveRules.professionalTax > 0)
        next.professionalTax = employee.ptApplicable ? effectiveRules.professionalTax : 0;
      if (effectiveRules.lwf > 0)
        next.lwf = employee.lwfApplicable ? effectiveRules.lwf : 0;
    }
    const accommodation = accommodationTotal(chargeMap.get(employee.id));
    if (chargeMap.has(employee.id)) Object.assign(next, accommodation);
    if (shouldRecomputeWages && effectiveRules.esiRate > 0) {
      const gross = payrollTotals(next).grossEarnings;
      const esiWage = employee.esiWageAmount || gross;
      next.esiDeduction = employee.esiApplicable && esiWage <= 21e3 ? roundMoney(esiWage * effectiveRules.esiRate / 100) : 0;
    }
    if ((next.importedGrossEarnings || 0) > 0) {
      if (!next.basic || next.basic <= 0) {
        next.basic = Math.max(0, roundMoney(next.importedGrossEarnings - (next.overtimeWages || 0) - (next.holidayWages || 0) - (next.sundayEarnings || 0) - (next.leaveWages || 0) - (next.roomAllowance || 0) - (next.attendanceBonus || 0) - (next.arrears || 0) - (next.da || 0) - (next.hra || 0) - (next.conveyance || 0) - (next.foodAllowance || 0) - (next.nightAllowance || 0) - (next.productionIncentive || 0) - (next.medicalAllowance || 0)));
      }
    }
    if (run.processingMode !== "salary_import" && next.overtimeHours > 0 && !next.overtimeWages && (effectiveRules.overtimeHourlyRate || 0) > 0) {
      next.overtimeWages = roundMoney(
        next.overtimeHours * overtimeMultiplier * (effectiveRules.overtimeHourlyRate || 0)
      );
    }
    const totals = payrollTotals(next);
    const employeeValidation = validationForEmployee(employee, effectiveRules);
    const salaryValuesPending = run.processingMode === "salary_import" && totals.grossEarnings <= 0;
    Object.assign(next, {
      grossEarnings: totals.grossEarnings,
      totalDeductions: totals.totalDeductions,
      netPayable: totals.netPayable,
      accommodationDeduction: totals.accommodationDeduction,
      returnAmount: totals.returnAmount,
      validationStatus: salaryValuesPending ? "review" : employeeValidation.validationStatus,
      validationMessage: salaryValuesPending ? [employeeValidation.validationMessage, "salary values pending"].filter(Boolean).join("; ") : employeeValidation.validationMessage
    });
    const {
      id,
      runId: ignoredRunId,
      employeeId: ignoredEmployeeId,
      ...values
    } = next;
    void ignoredRunId;
    void ignoredEmployeeId;
    const hasItemChanged = row.presentDays !== next.presentDays || row.absentDays !== next.absentDays || row.leaveDays !== next.leaveDays || row.weekOffDays !== next.weekOffDays || row.holidayPresentDays !== next.holidayPresentDays || row.payableDays !== next.payableDays || row.overtimeHours !== next.overtimeHours || row.basic !== next.basic || row.overtimeWages !== next.overtimeWages || row.grossEarnings !== next.grossEarnings || row.totalDeductions !== next.totalDeductions || row.netPayable !== next.netPayable || row.accommodationDeduction !== next.accommodationDeduction || row.returnAmount !== next.returnAmount || row.validationStatus !== next.validationStatus || row.validationMessage !== next.validationMessage;
    if (hasItemChanged) {
      itemUpdateTasks.push(
        () => db.update(payrollItems).set(values).where(eq(payrollItems.id, id))
      );
    }
    if (employee.complianceStatus !== next.validationStatus) {
      empUpdateTasks.push(
        () => db.update(employees).set({ complianceStatus: next.validationStatus }).where(eq(employees.id, employee.id))
      );
    }
    updatedRows.push({
      ...next,
      paymentMode: employee.paymentMode,
      bankAccountMasked: employee.bankAccountMasked,
      ifscMasked: employee.ifscMasked
    });
  }
  const allUpdateTasks = [...itemUpdateTasks, ...empUpdateTasks];
  for (let index2 = 0; index2 < allUpdateTasks.length; index2 += 25) {
    await Promise.all(
      allUpdateTasks.slice(index2, index2 + 25).map((task) => task())
    );
  }
  const grossEarnings = roundMoney(
    updatedRows.reduce((sum, row) => sum + row.grossEarnings, 0)
  );
  const statutoryDeductions = roundMoney(
    updatedRows.reduce(
      (sum, row) => sum + row.pfDeduction + row.esiDeduction + row.professionalTax + row.lwf + row.tds,
      0
    )
  );
  const accommodationDeductions = roundMoney(
    updatedRows.reduce((sum, row) => sum + row.accommodationDeduction, 0)
  );
  const totalDeductions = roundMoney(
    updatedRows.reduce((sum, row) => sum + row.totalDeductions, 0)
  );
  const otherDeductions = roundMoney(
    totalDeductions - statutoryDeductions - accommodationDeductions
  );
  const netPayable = roundMoney(
    updatedRows.reduce((sum, row) => sum + row.netPayable, 0)
  );
  const bankPayable = roundMoney(
    updatedRows.filter((row) => row.paymentMode === "bank" && Boolean(row.bankAccountMasked) && Boolean(row.ifscMasked)).reduce((sum, row) => sum + row.netPayable, 0)
  );
  const cashPayable = roundMoney(netPayable - bankPayable);
  const issueCount = updatedRows.filter(
    (row) => row.validationStatus !== "ready"
  ).length;
  await db.update(payrollRuns).set({
    employeeCount: updatedRows.length,
    grossEarnings,
    statutoryDeductions,
    otherDeductions,
    accommodationDeductions,
    netPayable,
    bankPayable,
    cashPayable,
    issueCount,
    status: run.status === "approved" ? "approved" : issueCount ? "needs_review" : "validated",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }).where(eq(payrollRuns.id, runId));
  const batches = await db.select().from(payrollBatches).where(eq(payrollBatches.runId, runId));
  for (const batch of batches.filter((entry) => entry.status !== "cleared")) {
    const grouped = updatedRows.filter(
      (row) => employeeMap.get(row.employeeId)?.accommodationType === batch.accommodationType
    );
    await db.update(payrollBatches).set({
      employeeCount: grouped.length,
      grossEarnings: roundMoney(
        grouped.reduce((sum, row) => sum + row.grossEarnings, 0)
      ),
      netPayable: roundMoney(
        grouped.reduce((sum, row) => sum + row.netPayable, 0)
      ),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }).where(eq(payrollBatches.id, batch.id));
  }
}
async function addEmployeesToRun(db, run, employeeRows) {
  if (!employeeRows.length) return 0;
  const existing = await db.select({ employeeId: payrollItems.employeeId }).from(payrollItems).where(eq(payrollItems.runId, run.id));
  const existingIds = new Set(existing.map((row) => row.employeeId));
  const rules = await activeRules(db, run.vendorId);
  const values = employeeRows.filter(
    (employee) => {
      if (employee.status === "active") return !existingIds.has(employee.id);
      if (employee.finalPayrollMonth) {
        const leftMonth = employee.dateOfLeaving ? employee.dateOfLeaving.slice(0, 7) : employee.finalPayrollMonth;
        const startMonth = leftMonth < employee.finalPayrollMonth ? leftMonth : employee.finalPayrollMonth;
        return run.payPeriod >= startMonth && run.payPeriod <= employee.finalPayrollMonth && !existingIds.has(employee.id);
      }
      return false;
    }
  ).map((employee) => ({
    id: `ITEM-${crypto.randomUUID()}`,
    runId: run.id,
    employeeId: employee.id,
    ...validationForEmployee(employee, rules)
  }));
  for (let index2 = 0; index2 < values.length; index2 += 25)
    await db.insert(payrollItems).values(values.slice(index2, index2 + 25));
  return values.length;
}
async function createRun(db, vendorId, unitId, period, options = {}) {
  const [client] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  const [unit] = await db.select().from(clientUnits).where(eq(clientUnits.id, unitId)).limit(1);
  if (!client || !unit || unit.vendorId !== vendorId)
    throw new RequestError("Select a valid client and employer unit", 404);
  if (client.status !== "active" || unit.status !== "active")
    throw new RequestError(
      "Reactivate the client and employer unit before creating payroll",
      409
    );
  const [existing] = await db.select().from(payrollRuns).where(
    and(
      eq(payrollRuns.clientUnitId, unitId),
      eq(payrollRuns.payPeriod, period)
    )
  ).limit(1);
  if (existing) return existing;
  const id = `RUN-${period.replace("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const rules = await activeRules(db, vendorId);
  const periodSettings = runPeriodValues(
    period,
    options,
    rules.standardWorkingDays
  );
  const processingMode = options.processingMode === "salary_import" ? "salary_import" : "attendance";
  await db.insert(payrollRuns).values({
    id,
    vendorId,
    clientUnitId: unitId,
    payPeriod: period,
    ...periodSettings,
    processingMode,
    status: "draft"
  });
  const run = await requireRun(db, id);
  const assigned = await db.select().from(employees).where(
    and(
      eq(employees.clientUnitId, unitId),
      or(
        eq(employees.status, "active"),
        and(
          gte(employees.finalPayrollMonth, period),
          lte(sql`coalesce(substr(${employees.dateOfLeaving}, 1, 7), ${employees.finalPayrollMonth})`, period)
        ),
        eq(employees.finalPayrollMonth, period)
      )
    )
  );
  await addEmployeesToRun(db, run, assigned);
  await syncPendingNegativeCarryovers(db, run);
  await recalculateRun(db, id, true);
  return requireRun(db, id);
}
function isJoySharedAccommodation(value) {
  const name = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return name.includes("joy") && (name.includes("hostel") || name.includes("room"));
}
function parseIsoDate(val) {
  if (!val || typeof val !== "string") return null;
  const s = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
function employeeValues(payload, vendorId, unitId) {
  const employeeCode = textValue(
    payload.employeeCode,
    "Employee code"
  ).toUpperCase();
  const name = textValue(payload.name, "Employee name");
  const accommodationType = normalizeAccommodationType(
    payload.accommodationType
  );
  const dateOfJoining = textValue(payload.dateOfJoining, "Date of joining");
  let applicationJson;
  if (typeof payload.applicationJson === "string" && payload.applicationJson.trim().length > 0) {
    if (payload.applicationJson.length > 1e7)
      throw new RequestError("Application details exceed the limit");
    let application;
    try {
      application = JSON.parse(payload.applicationJson);
    } catch {
      throw new RequestError("Invalid application details");
    }
    if (!application || typeof application !== "object" || Array.isArray(application) || Object.entries(application).some(
      ([key, value]) => key.length > 200 || typeof value !== "string" || key !== "Signature image" && !String(value).startsWith("data:") && value.length > 1e4
    ))
      throw new RequestError("Invalid application fields");
    applicationJson = JSON.stringify(application);
  } else if (payload.applicationJson && typeof payload.applicationJson === "object" && !Array.isArray(payload.applicationJson)) {
    applicationJson = JSON.stringify(payload.applicationJson);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfJoining))
    throw new RequestError("Date of joining must be YYYY-MM-DD");
  const appMap = (() => {
    try {
      const parsed = JSON.parse(applicationJson || (typeof payload.applicationJson === "string" ? payload.applicationJson : "{}"));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  })();
  const explicitUan = payload.uanMasked !== void 0;
  const uanMasked = explicitUan ? optionalValue(payload.uanMasked) : optionalValue(payload.uanMasked) ?? optionalValue(appMap["PF / UAN Number"] || appMap["UAN"]);
  const explicitEsi = payload.esiMasked !== void 0;
  const esiMasked = explicitEsi ? optionalValue(payload.esiMasked) : optionalValue(payload.esiMasked) ?? optionalValue(appMap["ESI Number"] || appMap["ESI"]);
  const explicitBankAccount = payload.bankAccountMasked !== void 0;
  const bankAccountMasked = explicitBankAccount ? optionalValue(payload.bankAccountMasked) : optionalValue(payload.bankAccountMasked) ?? optionalValue(appMap["Account Number"] || appMap["Bank Account Number"]);
  const ifscMasked = bankAccountMasked ? explicitBankAccount && payload.ifscMasked !== void 0 ? optionalValue(payload.ifscMasked)?.toUpperCase() ?? null : (optionalValue(payload.ifscMasked) ?? optionalValue(appMap["IFSC Code"] || appMap["IFSC"]))?.toUpperCase() ?? null : null;
  const bankName = bankAccountMasked ? explicitBankAccount && payload.bankName !== void 0 ? optionalValue(payload.bankName) : optionalValue(payload.bankName) ?? optionalValue(appMap["Bank Name"]) : null;
  const bankBranch = bankAccountMasked ? explicitBankAccount && payload.bankBranch !== void 0 ? optionalValue(payload.bankBranch) : optionalValue(payload.bankBranch) ?? optionalValue(appMap["Bank Branch"] || appMap["Branch"]) : null;
  const paymentMode = bankAccountMasked ? payload.paymentMode === "cash" ? "cash" : "bank" : "cash";
  if (!bankAccountMasked && applicationJson) {
    try {
      const parsed = JSON.parse(applicationJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        delete parsed["Account Number"];
        delete parsed["Bank Account Number"];
        delete parsed["IFSC Code"];
        delete parsed["IFSC"];
        delete parsed["Bank Name"];
        delete parsed["Bank Branch"];
        delete parsed["Branch"];
        applicationJson = JSON.stringify(parsed);
      }
    } catch {
    }
  }
  if (!uanMasked && applicationJson) {
    try {
      const parsed = JSON.parse(applicationJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        delete parsed["PF / UAN Number"];
        delete parsed["UAN"];
        applicationJson = JSON.stringify(parsed);
      }
    } catch {
    }
  }
  if (!esiMasked && applicationJson) {
    try {
      const parsed = JSON.parse(applicationJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        delete parsed["ESI Number"];
        delete parsed["ESI"];
        applicationJson = JSON.stringify(parsed);
      }
    } catch {
    }
  }
  return {
    vendorId,
    clientUnitId: unitId,
    employeeCode,
    name,
    department: textValue(payload.department, "Department"),
    dateOfJoining,
    uanMasked,
    esiMasked,
    bankAccountMasked,
    ifscMasked,
    bankName,
    bankBranch,
    accommodationType,
    roomId: optionalValue(payload.roomId),
    roomNumber: optionalValue(payload.roomNumber),
    roomRentAmount: positiveValue(
      payload.roomRentAmount ?? 0,
      "Individual room rent"
    ),
    photoDataUrl: optionalValue(payload.photoDataUrl),
    mobileNumber: optionalValue(payload.mobileNumber) ?? optionalValue(appMap["Mobile number"] || appMap["Mobile Number"]),
    emailAddress: (optionalValue(payload.emailAddress) ?? optionalValue(appMap["Email address"] || appMap["Email Address"] || appMap["Email"]))?.toLowerCase() ?? null,
    emergencyContactNumber: optionalValue(payload.emergencyContactNumber) ?? optionalValue(appMap["Emergency Contact"] || appMap["Family - Father - Contact"] || appMap["Family - Spouse - Contact"]),
    addressLine: payload.addressLine !== void 0 ? optionalValue(payload.addressLine) : optionalValue(appMap["Residential address"] || appMap["Residential Address"] || appMap["Present address"] || appMap["Present Address"]) ?? null,
    district: optionalValue(payload.district) ?? optionalValue(appMap["District"] || appMap["Place of Birth"]),
    stateName: optionalValue(payload.stateName) ?? optionalValue(appMap["State"]),
    pincode: optionalValue(payload.pincode) ?? optionalValue(appMap["Pincode"] || appMap["Pin code"]),
    bloodGroup: optionalValue(payload.bloodGroup) ?? optionalValue(appMap["Blood group"] || appMap["Blood Group"]),
    gender: optionalValue(payload.gender) ?? optionalValue(appMap["Gender"]),
    fatherName: optionalValue(payload.fatherName) ?? optionalValue(appMap["Father - Name"] || appMap["Father Name"]),
    spouseName: optionalValue(payload.spouseName) ?? optionalValue(appMap["Spouse - Name"] || appMap["Spouse Name"]),
    maritalStatus: optionalValue(payload.maritalStatus) ?? optionalValue(appMap["Marital status"] || appMap["Marital Status"]),
    dateOfBirth: optionalValue(payload.dateOfBirth) ?? (appMap["Date of birth"] ? parseIsoDate(appMap["Date of birth"]) ?? null : null),
    highestQualification: optionalValue(payload.highestQualification) ?? optionalValue(appMap["Highest qualification"]),
    ...applicationJson !== void 0 ? { applicationJson } : {},
    pfApplicable: payload.pfApplicable === "no" ? 0 : 1,
    pfWageAmount: positiveValue(
      Number(payload.pfWageAmount) > 1e6 ? 0 : payload.pfWageAmount ?? 0,
      "PF wage"
    ),
    esiApplicable: payload.esiApplicable === "no" ? 0 : 1,
    esiWageAmount: positiveValue(
      Number(payload.esiWageAmount) > 1e6 ? 0 : payload.esiWageAmount ?? 0,
      "ESI wage"
    ),
    ptApplicable: payload.ptApplicable === "no" ? 0 : 1,
    lwfApplicable: payload.lwfApplicable === "no" ? 0 : 1,
    paymentMode,
    salaryAmount: positiveValue(payload.salaryAmount, "Salary amount"),
    salaryBasis: payload.salaryBasis === "daily" ? "daily" : "monthly",
    defaultShift: optionalValue(payload.defaultShift) ?? "General",
    shiftPattern: payload.shiftPattern === "rotational" ? "rotational" : "general",
    applicableShiftsJson: typeof payload.applicableShiftsJson === "string" ? payload.applicableShiftsJson : "[]",
    remarks: optionalValue(payload.remarks),
    employmentType: payload.employmentType === "direct" ? "direct" : "client"
  };
}
async function assignEmployeeAccommodation(db, values, employeeId) {
  const isOwnStay = isOwnOrTamilAccommodation(values.accommodationType);
  const hasNoRoom = !values.roomNumber || ["own", "tamil", "none", "-", ""].includes(values.roomNumber.trim().toLowerCase());
  if (isOwnStay && hasNoRoom) {
    const activeVendorTypes = await db.select().from(accommodationTypes).where(
      and(
        eq(accommodationTypes.vendorId, values.vendorId),
        eq(accommodationTypes.status, "active")
      )
    );
    const resolvedType = activeVendorTypes.find((t) => isOwnOrTamilAccommodation(t.name)) || activeVendorTypes.find((t) => t.name.toLowerCase() === (values.accommodationType || "").toLowerCase()) || activeVendorTypes[0];
    return {
      ...values,
      accommodationType: resolvedType?.name ?? (values.accommodationType || "Tamil / Own Accommodation"),
      roomId: null,
      roomNumber: null
    };
  }
  const vendorTypes = await db.select().from(accommodationTypes).where(
    and(
      eq(accommodationTypes.vendorId, values.vendorId),
      eq(accommodationTypes.status, "active")
    )
  );
  let type = vendorTypes.find((t) => t.name.toLowerCase() === (values.accommodationType || "").toLowerCase()) || (isOwnStay ? vendorTypes.find((t) => isOwnOrTamilAccommodation(t.name)) : void 0) || (values.accommodationType?.toLowerCase().includes("joy") ? vendorTypes.find((t) => t.name.toLowerCase().includes("joy")) : void 0) || (values.accommodationType?.toLowerCase().includes("outside") ? vendorTypes.find((t) => t.name.toLowerCase().includes("outside")) : void 0);
  if (!type && ["vendor-jcs", "vendor-jms"].includes(values.vendorId)) {
    const joyTypes = await db.select().from(accommodationTypes).where(
      and(
        inArray(accommodationTypes.vendorId, ["vendor-jcs", "vendor-jms"]),
        eq(accommodationTypes.status, "active")
      )
    );
    type = joyTypes.find((t) => t.name.toLowerCase() === (values.accommodationType || "").toLowerCase()) || (isOwnStay ? joyTypes.find((t) => isOwnOrTamilAccommodation(t.name)) : void 0) || (values.accommodationType?.toLowerCase().includes("joy") ? joyTypes.find((t) => t.name.toLowerCase().includes("joy")) : void 0) || (values.accommodationType?.toLowerCase().includes("outside") ? joyTypes.find((t) => t.name.toLowerCase().includes("outside")) : void 0);
  }
  if (!type && values.roomNumber) {
    const candidateRooms = await db.select().from(accommodationRooms).where(
      and(
        eq(accommodationRooms.status, "active"),
        eq(accommodationRooms.roomNumber, values.roomNumber)
      )
    );
    const matchRoom = candidateRooms.find((r) => r.vendorId === values.vendorId) || candidateRooms.find((r) => ["vendor-jcs", "vendor-jms"].includes(r.vendorId)) || candidateRooms[0];
    if (matchRoom) {
      const [rType] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, matchRoom.accommodationTypeId)).limit(1);
      if (rType && rType.status === "active") {
        type = rType;
      }
    }
  }
  if (!type && hasNoRoom) {
    type = vendorTypes[0];
    if (type) {
      return {
        ...values,
        accommodationType: type.name,
        roomId: null,
        roomNumber: null
      };
    }
  }
  if (!type || type.status !== "active")
    throw new RequestError(
      "Choose an active accommodation type for this client",
      409
    );
  values.accommodationType = type.name;
  let room = values.roomId ? (await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, values.roomId)).limit(1))[0] : void 0;
  if (room && values.roomNumber && room.roomNumber.toLowerCase() !== values.roomNumber.toLowerCase()) {
    room = void 0;
  }
  if (!room && values.roomNumber) {
    [room] = await db.select().from(accommodationRooms).where(
      and(
        eq(accommodationRooms.vendorId, values.vendorId),
        eq(accommodationRooms.accommodationTypeId, type.id),
        eq(accommodationRooms.roomNumber, values.roomNumber)
      )
    ).limit(1);
    if (!room) {
      const candidates = await db.select().from(accommodationRooms).where(
        and(
          eq(accommodationRooms.status, "active"),
          eq(accommodationRooms.roomNumber, values.roomNumber)
        )
      );
      room = candidates.find((c) => c.vendorId === values.vendorId) || candidates.find((c) => ["vendor-jcs", "vendor-jms"].includes(c.vendorId)) || candidates[0];
    }
  }
  if (!room && values.roomNumber) {
    const id = `ROOM-${crypto.randomUUID()}`;
    await db.insert(accommodationRooms).values({
      id,
      vendorId: values.vendorId,
      accommodationTypeId: type.id,
      roomNumber: values.roomNumber
    });
    [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, id)).limit(1);
  }
  if (!room) return { ...values, roomId: null, roomNumber: null };
  const [roomType] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, room.accommodationTypeId)).limit(1);
  const sharedJoyRoom = Boolean(
    roomType && isJoySharedAccommodation(type.name) && isJoySharedAccommodation(roomType.name)
  );
  let allowedRoom = false;
  if (room.vendorId === values.vendorId && room.accommodationTypeId === type.id) {
    allowedRoom = true;
  } else if (sharedJoyRoom) {
    allowedRoom = true;
  } else {
    if (room.hostelId) {
      const [hostel] = await db.select().from(hostels).where(eq(hostels.id, room.hostelId)).limit(1);
      if (hostel) {
        try {
          const scope = JSON.parse(hostel.clientScopeJson || "[]");
          if (!Array.isArray(scope) || scope.length === 0 || values.clientUnitId && scope.includes(values.clientUnitId)) {
            allowedRoom = true;
          }
        } catch {
          allowedRoom = true;
        }
      }
    }
    const joyVendors = ["vendor-jcs", "vendor-jms"];
    if (joyVendors.includes(room.vendorId) && joyVendors.includes(values.vendorId)) {
      if (roomType) {
        allowedRoom = true;
      }
    }
  }
  if (!allowedRoom) {
    throw new RequestError(
      "The selected room does not belong to this client and accommodation type",
      409
    );
  }
  const finalAccommodationType = roomType ? roomType.name : values.accommodationType;
  if (room.status !== "active")
    throw new RequestError(
      "Reactivate the room before assigning an employee",
      409
    );
  if (room.capacity > 0) {
    const occupants = await db.select({ id: employees.id }).from(employees).where(
      and(eq(employees.roomId, room.id), eq(employees.status, "active"))
    );
    if (occupants.filter((occupant) => occupant.id !== employeeId).length >= room.capacity) {
      throw new RequestError(
        `Room ${room.roomNumber} is already at its capacity of ${room.capacity} employees`,
        409
      );
    }
  }
  return { ...values, accommodationType: finalAccommodationType, roomId: room.id, roomNumber: room.roomNumber };
}
async function finalizeRoomExpense(db, expenseId, access, allowRefinalize = false) {
  const [expense] = await db.select().from(accommodationRoomExpenses).where(eq(accommodationRoomExpenses.id, expenseId)).limit(1);
  if (!expense) throw new RequestError("Room recovery entry not found", 404);
  const [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, expense.roomId)).limit(1);
  if (!room) throw new RequestError("Accommodation room not found", 404);
  requireClientScope(access, room.vendorId);
  const ledger = await db.select().from(accommodationRoomExpenses).where(
    and(
      eq(accommodationRoomExpenses.roomId, expense.roomId),
      eq(accommodationRoomExpenses.payPeriod, expense.payPeriod)
    )
  );
  if (!ledger.length)
    throw new RequestError("No room recovery entries were found", 404);
  if (!allowRefinalize && ledger.every((entry) => entry.status === "finalized"))
    throw new RequestError(
      "This room recovery month has already been finalized",
      409
    );
  const occupants = await db.select().from(employees).where(
    and(
      eq(employees.roomId, room.id),
      or(
        eq(employees.status, "active"),
        and(
          gte(employees.finalPayrollMonth, expense.payPeriod),
          lte(sql`coalesce(substr(${employees.dateOfLeaving}, 1, 7), ${employees.finalPayrollMonth})`, expense.payPeriod)
        ),
        eq(employees.finalPayrollMonth, expense.payPeriod)
      )
    )
  );
  if (!occupants.length)
    throw new RequestError(
      "Allocate at least one active employee before finalizing room recoveries",
      409
    );
  const affectedRuns = /* @__PURE__ */ new Map();
  const runByEmployee = /* @__PURE__ */ new Map();
  for (const employee of occupants) {
    requireUnitScope(access, employee.clientUnitId, employee.vendorId);
    const [run] = await db.select().from(payrollRuns).where(
      and(
        eq(payrollRuns.clientUnitId, employee.clientUnitId),
        eq(payrollRuns.payPeriod, expense.payPeriod)
      )
    ).limit(1);
    if (!run)
      throw new RequestError(
        `Create ${expense.payPeriod} payroll for ${employee.employeeCode} before finalizing room ${room.roomNumber}`,
        409
      );
    if (run.status === "approved")
      throw new RequestError(
        `Reopen ${employee.employeeCode}'s approved payroll before applying room recoveries`,
        409
      );
    const [item] = await db.select({ id: payrollItems.id }).from(payrollItems).where(
      and(
        eq(payrollItems.runId, run.id),
        eq(payrollItems.employeeId, employee.id)
      )
    ).limit(1);
    if (!item)
      throw new RequestError(
        `${employee.employeeCode} is missing from the ${expense.payPeriod} payroll run`,
        409
      );
    affectedRuns.set(run.id, run);
    runByEmployee.set(employee.id, run);
  }
  const aggregateExpense = {
    ...expense,
    gasAmount: roundMoney(
      ledger.reduce((sum, entry) => sum + numberValue(entry.gasAmount), 0)
    ),
    rationAmount: roundMoney(
      ledger.reduce((sum, entry) => sum + numberValue(entry.rationAmount), 0)
    ),
    provisionAmount: roundMoney(
      ledger.reduce((sum, entry) => sum + numberValue(entry.provisionAmount), 0)
    ),
    roomRentAmount: roundMoney(
      ledger.reduce((sum, entry) => sum + numberValue(entry.roomRentAmount), 0)
    ),
    transportRentAmount: roundMoney(
      ledger.reduce((sum, entry) => sum + numberValue(entry.transportRentAmount), 0)
    )
  };
  const shares = splitRoomExpenses(
    aggregateExpense,
    occupants.map((employee) => employee.id)
  );
  const anchorExpenseId = expense.id;
  for (const share of shares) {
    const run = runByEmployee.get(share.employeeId);
    if (!run) continue;
    const employee = occupants.find(
      (candidate) => candidate.id === share.employeeId
    );
    const fullRent = employee ? positiveValue(employee.roomRentAmount ?? 0, "Room rent") : 0;
    const joinedLate = Boolean(
      employee?.dateOfJoining?.startsWith(expense.payPeriod + "-") && Number(employee.dateOfJoining.slice(8, 10)) > room.rentCutoffDay
    );
    const defaultRent = roundMoney(
      fullRent * (joinedLate ? room.lateJoinRentPercent / 100 : 1)
    );
    const rent = share.rentShare > 0 ? share.rentShare : defaultRent;
    const bus = share.transportShare > 0 ? share.transportShare : 0;
    const [existing] = await db.select().from(accommodationCharges).where(
      and(
        eq(accommodationCharges.runId, run.id),
        eq(accommodationCharges.employeeId, share.employeeId)
      )
    ).limit(1);
    const resolvedRent = rent > 0 ? rent : existing ? numberValue(existing.rent) : 0;
    const resolvedBus = bus > 0 ? bus : existing ? numberValue(existing.bus) : 0;
    const values = {
      roomExpenseId: anchorExpenseId,
      roomNumber: room.roomNumber,
      gasShare: share.gasShare,
      rationShare: share.rationShare,
      provisionShare: share.provisionShare,
      rent: resolvedRent,
      bus: resolvedBus
    };
    if (existing)
      await db.update(accommodationCharges).set(values).where(eq(accommodationCharges.id, existing.id));
    else
      await db.insert(accommodationCharges).values({ runId: run.id, employeeId: share.employeeId, ...values });
  }
  const finalizedAt = (/* @__PURE__ */ new Date()).toISOString();
  await db.update(accommodationRoomExpenses).set({
    occupantCount: occupants.length,
    status: "finalized",
    finalizedBy: access.identity.email,
    finalizedAt,
    updatedAt: finalizedAt
  }).where(
    and(
      eq(accommodationRoomExpenses.roomId, expense.roomId),
      eq(accommodationRoomExpenses.payPeriod, expense.payPeriod)
    )
  );
  for (const run of affectedRuns.values())
    await recalculateRun(db, run.id, false);
  return { expense, room, occupants, ledger };
}
async function updateUnitCount(db, unitId) {
  const rows = await db.select({ id: employees.id }).from(employees).where(
    and(eq(employees.clientUnitId, unitId), eq(employees.status, "active"))
  );
  await db.update(clientUnits).set({ employeeCount: rows.length }).where(eq(clientUnits.id, unitId));
}
async function importWorkbook(db, payload, actorEmail) {
  const vendorId = textValue(payload.vendorId, "Payroll entity");
  const unitId = textValue(payload.unitId, "Client unit");
  const period = periodValue(payload.payPeriod);
  const sourceType = String(payload.sourceType ?? "attendance");
  const importContext = String(
    payload.importContext ?? (sourceType === "employee" ? "employees" : sourceType === "salary" ? "payroll" : "attendance")
  );
  const isEmployeeMasterImport = importContext === "employees" || importContext === "employee_master";
  const importedEmployees = Array.isArray(payload.employees) ? payload.employees : [];
  const importedAttendance = Array.isArray(payload.attendance) ? payload.attendance : [];
  const importedItems = Array.isArray(payload.salaryItems) ? payload.salaryItems : [];
  if (!importedEmployees.length)
    throw new RequestError("No employee rows were found in the uploaded file");
  if (importedEmployees.length > 1e3 || importedAttendance.length > 35e3)
    throw new RequestError(
      "Import exceeds the limit of 1,000 employees or 35,000 attendance entries"
    );
  const run = await createRun(db, vendorId, unitId, period, {
    processingMode: sourceType === "salary" ? "salary_import" : "attendance"
  });
  if (sourceType === "salary" && run.processingMode !== "salary_import") {
    await db.update(payrollRuns).set({
      processingMode: "salary_import",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }).where(eq(payrollRuns.id, run.id));
  }
  await requireRun(db, run.id, true);
  const [allEmployees, allAccommodationTypes, allHostels, allRooms] = await Promise.all([
    db.select().from(employees),
    db.select().from(accommodationTypes),
    db.select().from(hostels),
    db.select().from(accommodationRooms)
  ]);
  const existingByCode = new Map(
    allEmployees.map((employee) => [
      employee.employeeCode.toUpperCase(),
      employee
    ])
  );
  const newRows = [];
  for (const imported of importedEmployees) {
    if (!imported.employeeCode || !imported.name) continue;
    const code = String(imported.employeeCode).trim().toUpperCase();
    const existing = existingByCode.get(code);
    if (existing && existing.clientUnitId !== unitId)
      throw new RequestError(
        `Employee ${code} is already assigned to another client unit`,
        409
      );
    if (existing) {
      if (!isEmployeeMasterImport) {
        if (sourceType === "salary" || importContext === "payroll") {
          const importedSalaryAmount = Number(imported.salaryAmount ?? 0);
          const importedSalaryBasis = optionalValue(imported.salaryBasis);
          const patch = {};
          if (importedSalaryBasis && importedSalaryBasis !== existing.salaryBasis) patch.salaryBasis = importedSalaryBasis;
          if (importedSalaryAmount > 0 && importedSalaryAmount !== existing.salaryAmount) patch.salaryAmount = importedSalaryAmount;
          if (Object.keys(patch).length > 0) {
            await db.update(employees).set(patch).where(eq(employees.id, existing.id));
            existingByCode.set(code, { ...existing, ...patch });
          }
        }
        continue;
      }
      if (sourceType === "salary") {
        const importedName = optionalValue(imported.name);
        const importedSalaryAmount = Number(imported.salaryAmount ?? 0);
        const importedSalaryBasis = optionalValue(imported.salaryBasis);
        const patch = {};
        if (importedName && importedName !== existing.name) patch.name = importedName;
        if (importedSalaryBasis && importedSalaryBasis !== existing.salaryBasis) patch.salaryBasis = importedSalaryBasis;
        if (importedSalaryAmount > 0 && importedSalaryAmount !== existing.salaryAmount) patch.salaryAmount = importedSalaryAmount;
        if (Object.keys(patch).length > 0) {
          await db.update(employees).set(patch).where(eq(employees.id, existing.id));
        }
      } else if (payload.overwriteExisting !== false) {
        let importedAccommodationType2 = normalizeAccommodationType(
          imported.accommodationType || existing.accommodationType
        );
        let importedRoomId2 = existing.roomId;
        let importedRoomNumber2 = optionalValue(imported.roomNumber);
        if (imported.roomNumber === "" || imported.roomNumber === null || isOwnOrTamilAccommodation(importedAccommodationType2)) {
          importedRoomId2 = null;
          importedRoomNumber2 = null;
        } else if (importedRoomNumber2 !== void 0 && importedRoomNumber2 !== null) {
          if (existing.roomNumber && importedRoomNumber2.toLowerCase() !== existing.roomNumber.toLowerCase()) {
            importedRoomId2 = null;
          }
        } else {
          importedRoomNumber2 = existing.roomNumber;
        }
        const importedHostelName2 = optionalValue(imported.hostelName);
        if (importedHostelName2) {
          const importedHostel = allHostels.find(
            (hostel) => hostel.status === "active" && hostel.name.toLowerCase() === importedHostelName2.toLowerCase()
          );
          if (!importedHostel)
            throw new RequestError(
              `Employee ${code}: hostel / area ${importedHostelName2} is not mapped to this employer unit`,
              409
            );
          const isScoped = (() => {
            try {
              const scope = JSON.parse(importedHostel.clientScopeJson || "[]");
              return !Array.isArray(scope) || scope.length === 0 || scope.includes(unitId);
            } catch {
              return true;
            }
          })();
          if (!isScoped)
            throw new RequestError(
              `Employee ${code}: hostel / area ${importedHostelName2} is not mapped to this employer unit`,
              409
            );
          if (!importedRoomNumber2)
            throw new RequestError(
              `Employee ${code}: enter Room number for hostel / area ${importedHostelName2}`,
              409
            );
          const importedRoom = allRooms.find(
            (room) => room.status === "active" && room.hostelId === importedHostel.id && room.roomNumber.toLowerCase() === importedRoomNumber2.toLowerCase()
          );
          if (!importedRoom)
            throw new RequestError(
              `Employee ${code}: room ${importedRoomNumber2} was not found in ${importedHostelName2}`,
              409
            );
          importedRoomId2 = importedRoom.id;
          importedRoomNumber2 = importedRoom.roomNumber;
          const hostelType = allAccommodationTypes.find(
            (type) => type.id === importedHostel.accommodationTypeId
          );
          if (hostelType) {
            importedAccommodationType2 = hostelType.name;
          }
        } else if (importedRoomNumber2 && !importedRoomId2) {
          const matchingRoom = allRooms.find(
            (room) => room.status === "active" && room.roomNumber.toLowerCase() === importedRoomNumber2.toLowerCase() && (room.vendorId === vendorId || ["vendor-jcs", "vendor-jms"].includes(room.vendorId) || room.hostelId && allHostels.some((h) => {
              if (h.id !== room.hostelId) return false;
              try {
                const scope = JSON.parse(h.clientScopeJson || "[]");
                return !Array.isArray(scope) || scope.length === 0 || scope.includes(unitId);
              } catch {
                return true;
              }
            }))
          );
          if (matchingRoom) {
            importedRoomId2 = matchingRoom.id;
            importedRoomNumber2 = matchingRoom.roomNumber;
            const rType = allAccommodationTypes.find(
              (t) => t.id === matchingRoom.accommodationTypeId
            );
            if (rType) {
              importedAccommodationType2 = rType.name;
            }
          }
        }
        let mergedApplicationJson = existing.applicationJson;
        if (mergedApplicationJson) {
          try {
            const parsedApp = JSON.parse(mergedApplicationJson);
            if (typeof imported.name === "string" && imported.name.trim()) {
              parsedApp["Full name"] = imported.name.trim();
              parsedApp["Applicant Name"] = imported.name.trim();
            }
            if (imported.bankAccountMasked && String(imported.bankAccountMasked).trim()) parsedApp["Account Number"] = String(imported.bankAccountMasked).trim();
            if (imported.ifscMasked && String(imported.ifscMasked).trim()) parsedApp["IFSC Code"] = String(imported.ifscMasked).trim();
            if (imported.bankName && String(imported.bankName).trim()) parsedApp["Bank Name"] = String(imported.bankName).trim();
            if (imported.bankBranch && String(imported.bankBranch).trim()) parsedApp["Branch Name"] = String(imported.bankBranch).trim();
            if (imported.uanMasked && String(imported.uanMasked).trim()) parsedApp["PF / UAN Number"] = String(imported.uanMasked).trim();
            if (imported.esiMasked && String(imported.esiMasked).trim()) parsedApp["ESI Number"] = String(imported.esiMasked).trim();
            if (imported.mobileNumber && String(imported.mobileNumber).trim()) parsedApp["Mobile number"] = String(imported.mobileNumber).trim();
            mergedApplicationJson = JSON.stringify(parsedApp);
          } catch {
          }
        }
        const keepVal = (importedVal, existingVal) => importedVal !== void 0 && importedVal !== null && String(importedVal).trim() !== "" ? importedVal : existingVal;
        const updated = await assignEmployeeAccommodation(
          db,
          employeeValues(
            {
              ...existing,
              ...imported,
              applicationJson: mergedApplicationJson,
              department: imported.department || existing.department || "General",
              dateOfJoining: imported.dateOfJoining || existing.dateOfJoining || `${period}-01`,
              salaryAmount: imported.salaryAmount ?? existing.salaryAmount,
              paymentMode: keepVal(imported.bankAccountMasked, existing.bankAccountMasked) ? "bank" : "cash",
              shiftPattern: imported.shiftPattern || existing.shiftPattern || "general",
              pfApplicable: keepVal(imported.pfApplicable, existing.pfApplicable),
              esiApplicable: keepVal(imported.esiApplicable, existing.esiApplicable),
              ptApplicable: keepVal(imported.ptApplicable, existing.ptApplicable),
              lwfApplicable: keepVal(imported.lwfApplicable, existing.lwfApplicable),
              uanMasked: keepVal(imported.uanMasked, existing.uanMasked),
              esiMasked: keepVal(imported.esiMasked, existing.esiMasked),
              bankAccountMasked: keepVal(imported.bankAccountMasked, existing.bankAccountMasked),
              ifscMasked: keepVal(imported.ifscMasked, existing.ifscMasked),
              bankName: keepVal(imported.bankName, existing.bankName),
              bankBranch: keepVal(imported.bankBranch, existing.bankBranch),
              mobileNumber: keepVal(imported.mobileNumber, existing.mobileNumber),
              emailAddress: keepVal(imported.emailAddress, existing.emailAddress),
              emergencyContactNumber: keepVal(imported.emergencyContactNumber, existing.emergencyContactNumber),
              addressLine: keepVal(imported.addressLine, existing.addressLine),
              district: keepVal(imported.district, existing.district),
              stateName: keepVal(imported.stateName, existing.stateName),
              pincode: keepVal(imported.pincode, existing.pincode),
              bloodGroup: keepVal(imported.bloodGroup, existing.bloodGroup),
              gender: keepVal(imported.gender, existing.gender),
              highestQualification: keepVal(imported.highestQualification, existing.highestQualification),
              fatherName: keepVal(imported.fatherName, existing.fatherName),
              maritalStatus: keepVal(imported.maritalStatus, existing.maritalStatus),
              spouseName: keepVal(imported.spouseName, existing.spouseName),
              dateOfBirth: keepVal(imported.dateOfBirth, existing.dateOfBirth),
              accommodationType: importedAccommodationType2,
              roomId: importedRoomId2,
              roomNumber: importedRoomNumber2
            },
            vendorId,
            unitId
          ),
          existing.id
        );
        await db.update(employees).set(updated).where(eq(employees.id, existing.id));
        existingByCode.set(code, { ...existing, ...updated });
      }
      continue;
    }
    let importedAccommodationType = normalizeAccommodationType(
      imported.accommodationType
    );
    let importedRoomId = null;
    let importedRoomNumber = optionalValue(imported.roomNumber);
    if (imported.roomNumber === "" || imported.roomNumber === null || isOwnOrTamilAccommodation(importedAccommodationType)) {
      importedRoomId = null;
      importedRoomNumber = null;
    }
    const importedHostelName = optionalValue(imported.hostelName);
    if (importedHostelName) {
      const importedHostel = allHostels.find(
        (hostel) => hostel.status === "active" && hostel.name.toLowerCase() === importedHostelName.toLowerCase()
      );
      if (!importedHostel)
        throw new RequestError(
          `Employee ${code}: hostel / area ${importedHostelName} is not mapped to this employer unit`,
          409
        );
      const isScoped = (() => {
        try {
          const scope = JSON.parse(importedHostel.clientScopeJson || "[]");
          return !Array.isArray(scope) || scope.length === 0 || scope.includes(unitId);
        } catch {
          return true;
        }
      })();
      if (!isScoped)
        throw new RequestError(
          `Employee ${code}: hostel / area ${importedHostelName} is not mapped to this employer unit`,
          409
        );
      if (!importedRoomNumber)
        throw new RequestError(
          `Employee ${code}: enter Room number for hostel / area ${importedHostelName}`,
          409
        );
      const importedRoom = allRooms.find(
        (room) => room.status === "active" && room.hostelId === importedHostel.id && room.roomNumber.toLowerCase() === importedRoomNumber.toLowerCase()
      );
      if (!importedRoom)
        throw new RequestError(
          `Employee ${code}: room ${importedRoomNumber} was not found in ${importedHostelName}`,
          409
        );
      importedRoomId = importedRoom.id;
      importedRoomNumber = importedRoom.roomNumber;
      const hostelType = allAccommodationTypes.find(
        (type) => type.id === importedHostel.accommodationTypeId
      );
      if (hostelType) {
        importedAccommodationType = hostelType.name;
      }
    } else if (importedRoomNumber && !importedRoomId) {
      const matchingRoom = allRooms.find(
        (room) => room.status === "active" && room.roomNumber.toLowerCase() === importedRoomNumber.toLowerCase() && (room.vendorId === vendorId || ["vendor-jcs", "vendor-jms"].includes(room.vendorId) || room.hostelId && allHostels.some((h) => {
          if (h.id !== room.hostelId) return false;
          try {
            const scope = JSON.parse(h.clientScopeJson || "[]");
            return !Array.isArray(scope) || scope.length === 0 || scope.includes(unitId);
          } catch {
            return true;
          }
        }))
      );
      if (matchingRoom) {
        importedRoomId = matchingRoom.id;
        importedRoomNumber = matchingRoom.roomNumber;
        const rType = allAccommodationTypes.find(
          (t) => t.id === matchingRoom.accommodationTypeId
        );
        if (rType) {
          importedAccommodationType = rType.name;
        }
      }
    }
    const value = await assignEmployeeAccommodation(
      db,
      employeeValues(
        {
          department: "General",
          dateOfJoining: `${period}-01`,
          salaryAmount: 0,
          paymentMode: imported.bankAccountMasked ? "bank" : "cash",
          shiftPattern: "general",
          ...imported,
          accommodationType: importedAccommodationType,
          roomId: importedRoomId,
          roomNumber: importedRoomNumber
        },
        vendorId,
        unitId
      )
    );
    const employee = {
      id: `EMP-${crypto.randomUUID()}`,
      ...value,
      complianceStatus: isEmployeeMasterImport ? "ready" : "pending",
      status: "active"
    };
    newRows.push(employee);
    existingByCode.set(code, employee);
  }
  for (let index2 = 0; index2 < newRows.length; index2 += 25)
    await db.insert(employees).values(newRows.slice(index2, index2 + 25));
  const assigned = await db.select().from(employees).where(eq(employees.clientUnitId, unitId));
  const employeeByCode = new Map(
    assigned.map((employee) => [employee.employeeCode.toUpperCase(), employee])
  );
  await addEmployeesToRun(db, run, assigned);
  const runItemIdentityRows = await db.select({ id: payrollItems.id, employeeId: payrollItems.employeeId }).from(payrollItems).where(eq(payrollItems.runId, run.id));
  const downloadedItemIds = await downloadedPayrollItemIds(db, run.id);
  const downloadedEmployeeIds = new Set(
    runItemIdentityRows.filter((item) => downloadedItemIds.has(item.id)).map((item) => item.employeeId)
  );
  if (importedAttendance.length) {
    const { start, end } = periodRange(period, run.periodStart, run.periodEnd);
    const existingAttendance = await db.select().from(attendanceEntries).where(
      and(
        gte(attendanceEntries.attendanceDate, start),
        lt(attendanceEntries.attendanceDate, end)
      )
    );
    const existingMap = new Map(
      existingAttendance.map((entry) => [
        `${entry.employeeId}:${entry.attendanceDate}`,
        entry.id
      ])
    );
    const statements = [];
    const d1 = getRawDb();
    for (const entry of importedAttendance) {
      const employee = employeeByCode.get(
        String(entry.employeeCode ?? "").trim().toUpperCase()
      );
      const date2 = String(entry.attendanceDate ?? "");
      const status = String(entry.statusCode ?? "").toUpperCase();
      if (!employee || downloadedEmployeeIds.has(employee.id) || date2 < start || date2 >= end || !ATTENDANCE_CODES.includes(status))
        continue;
      const shift = optionalValue(entry.shiftCode) ?? employee.defaultShift;
      const overtime = positiveValue(entry.overtimeHours, "Overtime hours", 24);
      const current = existingMap.get(`${employee.id}:${date2}`);
      if (current)
        statements.push(
          d1.prepare(
            "UPDATE attendance_entries SET status_code = ?, shift_code = ?, overtime_hours = ?, source = ?, updated_by = ?, updated_at = ? WHERE id = ?"
          ).bind(
            status,
            shift,
            overtime,
            "import",
            actorEmail,
            (/* @__PURE__ */ new Date()).toISOString(),
            current
          )
        );
      else
        statements.push(
          d1.prepare(
            "INSERT INTO attendance_entries (employee_id, attendance_date, status_code, shift_code, overtime_hours, source, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          ).bind(
            employee.id,
            date2,
            status,
            shift,
            overtime,
            "import",
            actorEmail,
            (/* @__PURE__ */ new Date()).toISOString()
          )
        );
    }
    for (let index2 = 0; index2 < statements.length; index2 += 200)
      await d1.batch(statements.slice(index2, index2 + 200));
  }
  if (importedItems.length) {
    const itemRows = await db.select().from(payrollItems).where(eq(payrollItems.runId, run.id));
    const itemByEmployee = new Map(
      itemRows.map((row) => [row.employeeId, row])
    );
    const updateTasks = [];
    for (const imported of importedItems) {
      const employee = employeeByCode.get(
        String(imported.employeeCode ?? "").trim().toUpperCase()
      );
      const item = employee ? itemByEmployee.get(employee.id) : null;
      if (!employee || !item || downloadedItemIds.has(item.id)) continue;
      const update = {};
      for (const field of [...earningFields, ...deductionFields])
        if (Object.hasOwn(imported, field))
          update[field] = positiveValue(imported[field], field);
      for (const field of [
        "presentDays",
        "payableDays",
        "overtimeHours",
        "fixedWorkingDays",
        "nfhDays",
        "compOffDays",
        "onDutyDays",
        "sundayDays",
        "plDays",
        "clDays",
        "slDays"
      ])
        if (Object.hasOwn(imported, field))
          update[field] = positiveValue(imported[field], field);
      const importedTotals = {
        importedGrossEarnings: Object.hasOwn(imported, "sourceGrossEarnings") ? positiveValue(imported.sourceGrossEarnings, "Gross Earnings") : item.importedGrossEarnings,
        importedTotalDeductions: Object.hasOwn(imported, "sourceTotalDeductions") ? positiveValue(imported.sourceTotalDeductions, "Total Deductions") : item.importedTotalDeductions,
        importedNetPayable: Object.hasOwn(imported, "sourceNetPayable") ? positiveValue(imported.sourceNetPayable, "Net Payable") : item.importedNetPayable
      };
      if (!update.basic && importedTotals.importedGrossEarnings && importedTotals.importedGrossEarnings > 0) {
        update.basic = Math.max(0, roundMoney(importedTotals.importedGrossEarnings - (Number(update.overtimeWages ?? item.overtimeWages) || 0) - (Number(update.holidayWages ?? item.holidayWages) || 0) - (Number(update.sundayEarnings ?? item.sundayEarnings) || 0) - (Number(update.leaveWages ?? item.leaveWages) || 0) - (Number(update.roomAllowance ?? item.roomAllowance) || 0) - (Number(update.attendanceBonus ?? item.attendanceBonus) || 0) - (Number(update.arrears ?? item.arrears) || 0) - (Number(update.da ?? item.da) || 0) - (Number(update.hra ?? item.hra) || 0) - (Number(update.conveyance ?? item.conveyance) || 0) - (Number(update.foodAllowance ?? item.foodAllowance) || 0) - (Number(update.nightAllowance ?? item.nightAllowance) || 0) - (Number(update.productionIncentive ?? item.productionIncentive) || 0) - (Number(update.medicalAllowance ?? item.medicalAllowance) || 0)));
      }
      const totals = payrollTotals({ ...item, ...update, ...importedTotals });
      updateTasks.push(
        () => db.update(payrollItems).set({
          ...update,
          ...importedTotals,
          basic: update.basic ?? item.basic,
          grossEarnings: totals.grossEarnings,
          totalDeductions: totals.totalDeductions,
          netPayable: totals.netPayable
        }).where(eq(payrollItems.id, item.id))
      );
    }
    for (let index2 = 0; index2 < updateTasks.length; index2 += 25) {
      await Promise.all(
        updateTasks.slice(index2, index2 + 25).map((task) => task())
      );
    }
  }
  await updateUnitCount(db, unitId);
  await recalculateRun(
    db,
    run.id,
    sourceType !== "salary" && importedAttendance.length > 0 && downloadedItemIds.size === 0
  );
  await writeAudit(
    db,
    "workbook_imported",
    "payroll_run",
    run.id,
    `Imported ${importedEmployees.length} employees and ${importedAttendance.length} attendance entries from ${sourceType} workbook`,
    actorEmail
  );
  return run.id;
}
async function activeSuperAdminCount(db, excludeId) {
  const rows = await db.select({ id: appUsers.id, role: appUsers.role, status: appUsers.status }).from(appUsers);
  return rows.filter(
    (row) => row.id !== excludeId && row.role === "super_admin" && row.status === "active"
  ).length;
}
function permissionPayload(value) {
  return value && typeof value === "object" ? value : {};
}
async function createSupabaseAuthUser(email, password) {
  const deno = globalThis.Deno;
  const supabaseUrl = deno?.env.get("SUPABASE_URL");
  const serviceKey = deno?.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return;
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { must_change_password: true }
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    if (!detail.toLowerCase().includes("already") && response.status !== 422)
      throw new RequestError(
        "Supabase sign-in account could not be created",
        502
      );
  }
}
var datedRecoveryFields = [
  "rent",
  "bus",
  "food",
  "advance",
  "gasShare",
  "rationShare",
  "provisionShare",
  "idCard",
  "medical",
  "ticket",
  "shoe",
  "aadhaarUpdate",
  "bankAccountCharge",
  "tshirt",
  "oldPending",
  "returnAmount"
];
async function syncDatedRecoveriesBulk(db, runId, employeeIds) {
  if (!employeeIds.length) return;
  const rows = await db.select().from(recoveryEntries).where(
    and(
      eq(recoveryEntries.runId, runId),
      inArray(recoveryEntries.employeeId, employeeIds)
    )
  );
  const rowsByEmployee = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const list = rowsByEmployee.get(row.employeeId) ?? [];
    list.push(row);
    rowsByEmployee.set(row.employeeId, list);
  }
  const existingCharges = await db.select().from(accommodationCharges).where(
    and(
      eq(accommodationCharges.runId, runId),
      inArray(accommodationCharges.employeeId, employeeIds)
    )
  );
  const existingMap = new Map(existingCharges.map((c) => [c.employeeId, c]));
  const roomExpenseIds = [...new Set(existingCharges.map((c) => c.roomExpenseId).filter(Boolean))];
  const roomExpenses = roomExpenseIds.length ? await db.select().from(accommodationRoomExpenses).where(inArray(accommodationRoomExpenses.id, roomExpenseIds)) : [];
  const roomExpMap = new Map(roomExpenses.map((re) => [re.id, re]));
  for (const empId of employeeIds) {
    const empRows = rowsByEmployee.get(empId) ?? [];
    const totals = Object.fromEntries(
      datedRecoveryFields.map((field) => [
        field,
        roundMoney(
          empRows.filter((entry) => entry.recoveryType === field).reduce((sum, entry) => sum + entry.amount, 0)
        )
      ])
    );
    const existing = existingMap.get(empId);
    if (existing) {
      const mergedTotals = { ...totals };
      const roomExp = existing.roomExpenseId ? roomExpMap.get(existing.roomExpenseId) : null;
      const count = roomExp && roomExp.occupantCount > 0 ? roomExp.occupantCount : 1;
      const roomGas = roomExp ? roundMoney((roomExp.gasAmount || 0) / count) : 0;
      const roomRation = roomExp ? roundMoney((roomExp.rationAmount || 0) / count) : 0;
      const roomProvision = roomExp ? roundMoney((roomExp.provisionAmount || 0) / count) : 0;
      const roomRent = roomExp ? roundMoney((roomExp.roomRentAmount || 0) / count) : 0;
      const roomBus = roomExp ? roundMoney((roomExp.transportRentAmount || 0) / count) : 0;
      mergedTotals.gasShare = roundMoney(roomGas + totals.gasShare);
      mergedTotals.rationShare = roundMoney(roomRation + totals.rationShare);
      mergedTotals.provisionShare = roundMoney(roomProvision + totals.provisionShare);
      mergedTotals.rent = roundMoney(
        (roomRent > 0 ? roomRent : !empRows.some((entry) => entry.recoveryType === "rent") ? numberValue(existing.rent) : 0) + totals.rent
      );
      mergedTotals.bus = roundMoney(
        (roomBus > 0 ? roomBus : !empRows.some((entry) => entry.recoveryType === "bus") ? numberValue(existing.bus) : 0) + totals.bus
      );
      await db.update(accommodationCharges).set(mergedTotals).where(eq(accommodationCharges.id, existing.id));
    } else if (empRows.length) {
      await db.insert(accommodationCharges).values({ runId, employeeId: empId, ...totals });
    }
  }
  await recalculateRun(db, runId, false);
}
async function syncDatedRecoveries(db, runId, employeeId) {
  return syncDatedRecoveriesBulk(db, runId, [employeeId]);
}
async function syncPendingNegativeCarryovers(db, targetRun) {
  const priorApprovedRuns = await db.select().from(payrollRuns).where(
    and(
      eq(payrollRuns.clientUnitId, targetRun.clientUnitId),
      eq(payrollRuns.status, "approved"),
      lt(payrollRuns.payPeriod, targetRun.payPeriod)
    )
  ).orderBy(desc(payrollRuns.payPeriod));
  if (!priorApprovedRuns.length) return;
  const lastApprovedRun = priorApprovedRuns[0];
  const priorItems = await db.select().from(payrollItems).where(eq(payrollItems.runId, lastApprovedRun.id));
  const deficitItems = priorItems.filter((item) => {
    const rawNet = (item.grossEarnings || 0) - (item.totalDeductions || 0) + (item.returnAmount || 0);
    return rawNet < -9e-3;
  });
  if (!deficitItems.length) return;
  const runRecoveries = await db.select().from(recoveryEntries).where(eq(recoveryEntries.runId, targetRun.id));
  const prefix = `CARRYOVER-${lastApprovedRun.id}-`;
  const existingMap = new Map(
    runRecoveries.filter((r) => r.reference && r.reference.startsWith(prefix)).map((r) => [r.employeeId, r])
  );
  const affectedEmployeeIds = [];
  for (const item of deficitItems) {
    const rawNet = (item.grossEarnings || 0) - (item.totalDeductions || 0) + (item.returnAmount || 0);
    const deficitAmount = roundMoney(Math.abs(rawNet));
    if (deficitAmount <= 0) continue;
    const ref = `${prefix}${item.employeeId}`;
    const existingEntry = existingMap.get(item.employeeId);
    if (existingEntry) {
      if (Math.abs(existingEntry.amount - deficitAmount) >= 0.01) {
        await db.update(recoveryEntries).set({ amount: deficitAmount }).where(eq(recoveryEntries.id, existingEntry.id));
        affectedEmployeeIds.push(item.employeeId);
      }
    } else {
      await db.insert(recoveryEntries).values({
        id: `REC-${crypto.randomUUID()}`,
        runId: targetRun.id,
        employeeId: item.employeeId,
        recoveryDate: targetRun.periodStart || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        recoveryType: "oldPending",
        amount: deficitAmount,
        reference: ref,
        notes: `Negative net pay carryover from ${lastApprovedRun.payPeriod}`,
        createdBy: "system_carryover"
      });
      affectedEmployeeIds.push(item.employeeId);
    }
  }
  if (affectedEmployeeIds.length) {
    await syncDatedRecoveriesBulk(db, targetRun.id, affectedEmployeeIds);
  }
}
async function saveAppUser(db, payload, access) {
  requireSuperAdmin(access);
  const existingId = optionalValue(payload.id);
  const email = textValue(payload.email, "User email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new RequestError("Enter a valid user email address");
  const fullName = optionalValue(payload.fullName);
  const role = normalizeRole(payload.role);
  const permissions = normalizePermissions(
    role,
    permissionPayload(payload.permissions)
  );
  const canApprovePayroll = role === "super_admin" || payload.canApprovePayroll === true || payload.canApprovePayroll === 1 || payload.canApprovePayroll === "on";
  let clientScope = normalizedScope(payload.clientScope ?? payload.clientIds);
  let unitScope = normalizedScope(payload.unitScope ?? payload.unitIds);
  let hostelScope = normalizedScope(payload.hostelScope ?? payload.hostelIds);
  if (role === "super_admin") {
    clientScope = [];
    unitScope = [];
    hostelScope = [];
  } else if (role === "payroll_team") {
    if (!clientScope.length)
      throw new RequestError(
        "Assign at least one client to a Payroll Team user"
      );
    const assignedClients = await db.select({ id: vendors.id }).from(vendors).where(inArray(vendors.id, clientScope));
    if (!assignedClients.length)
      throw new RequestError(
        "Assign at least one valid client to a Payroll Team user",
        400
      );
    clientScope = assignedClients.map((client) => client.id);
    unitScope = [];
    hostelScope = [];
  } else if (role === "hostel_incharge") {
    if (!hostelScope.length)
      throw new RequestError(
        "Assign at least one hostel to a Hostel In-charge user"
      );
    const assignedHostels = await db.select({ id: hostels.id, vendorId: hostels.vendorId }).from(hostels).where(inArray(hostels.id, hostelScope));
    if (!assignedHostels.length)
      throw new RequestError(
        "Assign at least one valid hostel to a Hostel In-charge user",
        400
      );
    hostelScope = assignedHostels.map((hostel) => hostel.id);
    clientScope = normalizedScope(
      assignedHostels.map((hostel) => hostel.vendorId)
    );
    unitScope = [];
  } else if (role === "vendor") {
    if (unitScope.length) {
      const assignedUnits = await db.select({ id: clientUnits.id, vendorId: clientUnits.vendorId }).from(clientUnits).where(inArray(clientUnits.id, unitScope));
      unitScope = assignedUnits.map((unit) => unit.id);
      clientScope = normalizedScope(assignedUnits.map((unit) => unit.vendorId));
    } else {
      unitScope = [];
      clientScope = [];
    }
    hostelScope = [];
  } else {
    if (!unitScope.length)
      throw new RequestError(
        "Assign at least one employer unit to this HR user"
      );
    const assignedUnits = await db.select({ id: clientUnits.id, vendorId: clientUnits.vendorId }).from(clientUnits).where(inArray(clientUnits.id, unitScope));
    if (!assignedUnits.length)
      throw new RequestError(
        "Assign at least one valid employer unit to this HR user",
        400
      );
    unitScope = assignedUnits.map((unit) => unit.id);
    clientScope = normalizedScope(assignedUnits.map((unit) => unit.vendorId));
    hostelScope = [];
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const values = {
    email,
    fullName,
    employeeCode: optionalValue(payload.employeeCode),
    department: optionalValue(payload.department),
    dateOfJoining: payload.dateOfJoining ? dateValue(payload.dateOfJoining, "Joining date") : null,
    mobileNumber: optionalValue(payload.mobileNumber),
    role,
    permissionsJson: JSON.stringify(permissions),
    clientScopeJson: JSON.stringify(clientScope),
    unitScopeJson: JSON.stringify(unitScope),
    hostelScopeJson: JSON.stringify(hostelScope),
    canApprovePayroll: canApprovePayroll ? 1 : 0,
    approvalManagerEmail: role === "super_admin" ? null : optionalValue(payload.approvalManagerEmail)?.toLowerCase() ?? null,
    approvalSequence: role === "super_admin" ? 999 : positiveValue(payload.approvalSequence ?? 0, "Approval sequence", 999),
    updatedAt: now
  };
  const [emailOwner] = await db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, email)).limit(1);
  if (emailOwner && emailOwner.id !== existingId)
    throw new RequestError(
      "A user profile already exists for this email address",
      409
    );
  if (existingId) {
    const [existing] = await db.select().from(appUsers).where(eq(appUsers.id, existingId)).limit(1);
    if (!existing) throw new RequestError("User profile not found", 404);
    if (existing.email === access.identity.email.toLowerCase() && (email !== existing.email || role !== "super_admin"))
      throw new RequestError(
        "You cannot change your own Super Admin identity or role",
        409
      );
    if (existing.role === "super_admin" && existing.status === "active" && role !== "super_admin" && await activeSuperAdminCount(db, existing.id) === 0)
      throw new RequestError(
        "Create another active Super Admin before changing this role",
        409
      );
    await db.update(appUsers).set(values).where(eq(appUsers.id, existingId));
    await writeAudit(
      db,
      "user_updated",
      "app_user",
      existingId,
      `Updated ${email} as ${role.replaceAll("_", " ")}`,
      access.identity.email
    );
    return;
  }
  const id = `USER-${crypto.randomUUID()}`;
  const temporaryPassword = textValue(
    payload.temporaryPassword,
    "Temporary password"
  );
  if (temporaryPassword.length < 12)
    throw new RequestError(
      "Temporary password must contain at least 12 characters"
    );
  await createSupabaseAuthUser(email, temporaryPassword);
  await db.insert(appUsers).values({
    id,
    ...values,
    status: "active",
    createdBy: access.identity.email,
    createdAt: now
  });
  await writeAudit(
    db,
    "user_created",
    "app_user",
    id,
    `Added ${email} as ${role.replaceAll("_", " ")}`,
    access.identity.email
  );
}
async function POST(request, identity) {
  try {
    const payload = await request.json();
    const action = textValue(payload.action, "Action");
    const db = getDb();
    const access = await requireAppAccess(db, identity);
    if (action === "approve") {
      requireModule(access, "payroll", "manage");
      if (!access.profile.canApprovePayroll)
        throw new RequestError(
          "Your profile can process payroll but does not have final approval authority",
          403
        );
    } else if (action === "reopen-payroll-for-recovery") {
      requireModule(access, "payroll", "manage");
      requireModule(access, "payments", "manage");
      if (!access.profile.canApprovePayroll)
        throw new RequestError(
          "Only a Super Admin or authorised payroll approver can reopen cleared payments for recovery correction",
          403
        );
    } else {
      const required = actionPermission(action, payload);
      if (required) requireModule(access, required.module, required.level);
    }
    if (action === "save-app-user" || (action === "set-record-status" || action === "delete-record") && payload.entityType === "app_user")
      requireSuperAdmin(
        access,
        "Only a Super Admin can manage users and access profiles."
      );
    if (action === "delete-employee" || action === "delete-employees" || action === "delete-record" && payload.entityType === "employee") {
      requireSuperAdmin(
        access,
        "Only a Super Admin can permanently delete employees."
      );
    }
    await enforceActionScope(db, access, action, payload);
    if (["get-revenue-projection", "save-revenue-month-plan", "calculate-revenue-projection"].includes(action)) {
      if (access.profile.role !== "super_admin") throw new RequestError("Only Super Admin can access revenue projections.", 403);
      try {
        const month = typeof payload.month === "string" ? payload.month : "";
        const dates = monthDates(month);
        if (action === "save-revenue-month-plan") {
          const unitId = textValue(payload.unitId, "Client unit");
          const [unit] = await db.select({ id: clientUnits.id }).from(clientUnits).where(eq(clientUnits.id, unitId)).limit(1);
          if (!unit) throw new RequestError("Client unit not found.", 404);
          const config = validateRevenueMonth(month, payload.config);
          if (typeof payload.confirmed !== "boolean") throw new RequestError("Choose whether this month's calendar and rates are confirmed.");
          const revision = payload.revision;
          if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 0) throw new RequestError("Reload the monthly setup before saving.");
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const values = { id: `REV-${month}-${unitId}`, month, clientUnitId: unitId, configJson: JSON.stringify(config), revision: 1, confirmedAt: payload.confirmed ? now : null, updatedAt: now, updatedBy: access.identity.email };
          const saved = await db.insert(revenueMonthPlans).values(values).onConflictDoUpdate({
            target: [revenueMonthPlans.month, revenueMonthPlans.clientUnitId],
            set: { configJson: values.configJson, confirmedAt: values.confirmedAt, updatedAt: now, updatedBy: values.updatedBy, revision: sql`${revenueMonthPlans.revision} + 1` },
            setWhere: eq(revenueMonthPlans.revision, revision)
          }).returning();
          if (!saved.length) throw new RequestError("This monthly setup was changed in another session. Reload before saving your changes.", 409);
          await writeAudit(db, action, "revenue_month_plan", values.id, `${month} calendar and billing setup ${payload.confirmed ? "confirmed" : "saved as draft"}; revision ${saved[0].revision}`, access.identity.email);
          return Response.json({ plan: { unitId, month, config, revision: saved[0].revision, updatedAt: now, confirmedAt: values.confirmedAt } });
        }
        const [companyRows, unitRows, planRows] = await Promise.all([
          db.select({ id: vendors.id, name: vendors.name, status: vendors.status }).from(vendors).orderBy(asc(vendors.name)),
          db.select({ id: clientUnits.id, vendorId: clientUnits.vendorId, clientName: clientUnits.clientName, unitName: clientUnits.unitName, status: clientUnits.status, attendanceWorkingDays: clientUnits.attendanceWorkingDays, overtimeMultiplier: clientUnits.overtimeMultiplier }).from(clientUnits).orderBy(asc(clientUnits.clientName)),
          db.select().from(revenueMonthPlans).where(eq(revenueMonthPlans.month, month))
        ]);
        const plans = planRows.map((p) => ({ unitId: p.clientUnitId, month: p.month, config: JSON.parse(p.configJson), revision: p.revision, updatedAt: p.updatedAt, confirmedAt: p.confirmedAt }));
        if (action === "get-revenue-projection") {
          const rules = await db.select().from(payrollRules).orderBy(desc(payrollRules.effectiveFrom));
          return Response.json({ month, today: indiaToday(), companies: companyRows, units: unitRows, plans, defaults: Object.fromEntries(unitRows.map((u) => [u.id, defaultRevenueMonth(month, u, rules.find((r) => r.vendorId === u.vendorId))])) });
        }
        const cutoff = dateOnly(payload.asOfDate);
        if (cutoff > indiaToday() || cutoff > dates[dates.length - 1]) throw new RequestError("Choose an actuals cutoff no later than today or month end.");
        const units = unitRows.filter((u) => (!payload.vendorId || u.vendorId === payload.vendorId) && (!payload.clientName || u.clientName === payload.clientName) && (!payload.unitId || u.id === payload.unitId));
        const ids = units.map((u) => u.id);
        const staff = ids.length ? await db.select({ id: employees.id, vendorId: employees.vendorId, clientUnitId: employees.clientUnitId, dateOfJoining: employees.dateOfJoining, dateOfLeaving: employees.dateOfLeaving, status: employees.status, employmentType: employees.employmentType, salaryAmount: employees.salaryAmount, salaryBasis: employees.salaryBasis }).from(employees).where(inArray(employees.clientUnitId, ids)) : [];
        const start = [dates[0], shiftDate(cutoff, -27)].sort()[0];
        const entries = ids.length ? await db.select({ employeeId: attendanceEntries.employeeId, attendanceDate: attendanceEntries.attendanceDate, statusCode: attendanceEntries.statusCode, overtimeHours: attendanceEntries.overtimeHours }).from(attendanceEntries).innerJoin(employees, eq(employees.id, attendanceEntries.employeeId)).where(and(inArray(employees.clientUnitId, ids), gte(attendanceEntries.attendanceDate, start), lt(attendanceEntries.attendanceDate, shiftDate(cutoff, 1)))) : [];
        const source = { companies: companyRows, units: units.filter((u) => u.status === "active" || Boolean(payload.unitId) || staff.some((e) => e.clientUnitId === u.id && e.dateOfJoining <= dates[dates.length - 1] && (!e.dateOfLeaving || e.dateOfLeaving >= dates[0]))), employees: staff, attendance: entries, plans };
        const result = calculateRevenueProjection(access.profile.role, source, month, cutoff);
        if (payload.scenario && result.ready) result.scenario = calculateRevenueScenario(access.profile.role, source, result, payload.scenario);
        return Response.json({ result });
      } catch (error) {
        if (error instanceof RequestError) throw error;
        throw new RequestError(error instanceof Error ? error.message : "Unable to calculate the revenue projection.");
      }
    }
    if (action === "calculate-revenue") {
      if (access.profile.role !== "super_admin") throw new RequestError("Only Super Admin can use the revenue calculator.", 403);
      const run = await requireRun(db, textValue(payload.runId, "Payroll run"));
      const rows = await db.select({ employeeId: payrollItems.employeeId, grossEarnings: payrollItems.grossEarnings, payableDays: payrollItems.payableDays, overtimeHours: payrollItems.overtimeHours }).from(payrollItems).where(eq(payrollItems.runId, run.id));
      try {
        const result = calculateRevenue(access.profile.role, rows, payload.assumptions);
        return Response.json({ result, runId: run.id, payPeriod: run.payPeriod, status: run.status });
      } catch (error) {
        throw new RequestError(error instanceof Error ? error.message : "Invalid calculator assumptions");
      }
    }
    if (action === "get-application-documents") {
      requireModule(access, "employees", "view");
      const [employee] = await db.select().from(employees).where(eq(employees.id, textValue(payload.employeeId, "Employee"))).limit(1);
      if (!employee) throw new RequestError("Employee not found", 404);
      requireUnitScope(access, employee.clientUnitId, employee.vendorId);
      const documents = await db.select().from(applicationDocuments).where(eq(applicationDocuments.employeeId, employee.id)).orderBy(asc(applicationDocuments.category));
      let photoDataUrl = employee.photoDataUrl;
      const candidatePhotoDoc = documents.find((d) => d.category === "Candidate Photo");
      if (!photoDataUrl && candidatePhotoDoc?.dataUrl) {
        photoDataUrl = candidatePhotoDoc.dataUrl;
      }
      if (!candidatePhotoDoc && photoDataUrl) {
        const primaryDoc = documents.find((d) => d.uploadedAt || d.uploadedBy);
        const [creationAudit] = !primaryDoc ? await db.select({ createdAt: auditEvents.createdAt, actorEmail: auditEvents.actorEmail }).from(auditEvents).where(and(eq(auditEvents.entityId, employee.id), eq(auditEvents.action, "employee_created"))).limit(1) : [null];
        const photoUploadedAt = primaryDoc?.uploadedAt || creationAudit?.createdAt || employee.dateOfJoining || null;
        const photoUploadedBy = primaryDoc?.uploadedBy || creationAudit?.actorEmail || "HR Staff";
        documents.unshift({
          id: `DOC-PHOTO-${employee.id}`,
          employeeId: employee.id,
          category: "Candidate Photo",
          filename: `${employee.employeeCode}_photo.jpg`,
          dataUrl: photoDataUrl,
          status: "approved",
          rejectionReason: null,
          uploadedBy: photoUploadedBy,
          uploadedAt: photoUploadedAt,
          createdAt: photoUploadedAt,
          reviewedBy: primaryDoc?.reviewedBy || null,
          reviewedAt: primaryDoc?.reviewedAt || null
        });
      }
      return Response.json({ documents, photoDataUrl });
    }
    if (action === "get-employee-photo") {
      requireModule(access, "employees", "view");
      const employeeId = textValue(
        payload.employeeId || payload.payload?.employeeId,
        "Employee"
      );
      const [employee] = await db.select({
        id: employees.id,
        clientUnitId: employees.clientUnitId,
        vendorId: employees.vendorId,
        photoDataUrl: employees.photoDataUrl
      }).from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!employee) throw new RequestError("Employee not found", 404);
      requireUnitScope(access, employee.clientUnitId, employee.vendorId);
      let photoDataUrl = employee.photoDataUrl;
      if (!photoDataUrl) {
        const [candidateDoc] = await db.select({ dataUrl: applicationDocuments.dataUrl }).from(applicationDocuments).where(and(eq(applicationDocuments.employeeId, employee.id), eq(applicationDocuments.category, "Candidate Photo"))).limit(1);
        if (candidateDoc?.dataUrl) photoDataUrl = candidateDoc.dataUrl;
      }
      return Response.json({ photoDataUrl });
    }
    if (action === "review-application-document") {
      requireSuperAdmin(access);
      const employeeId = textValue(payload.employeeId, "Employee");
      const category = textValue(payload.category, "Category");
      const decision = textValue(payload.decision, "Decision");
      const rejectionReason = decision === "reject" ? optionalValue(payload.rejectionReason) || "Document does not meet verification criteria" : null;
      const status = decision === "approve" ? "approved" : "rejected";
      const reviewerIdentifier = access.profile.fullName ? `${access.profile.fullName} (${access.identity.email})` : access.identity.email;
      await db.update(applicationDocuments).set({
        status,
        rejectionReason,
        reviewedBy: reviewerIdentifier,
        reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(and(eq(applicationDocuments.employeeId, employeeId), eq(applicationDocuments.category, category)));
      await writeAudit(
        db,
        `document_${decision}`,
        "employee",
        employeeId,
        `${decision === "approve" ? "Approved" : "Rejected"} ${category} for employee by ${reviewerIdentifier}${rejectionReason ? ` (${rejectionReason})` : ""}`,
        access.identity.email
      );
      const documents = await db.select().from(applicationDocuments).where(eq(applicationDocuments.employeeId, employeeId)).orderBy(asc(applicationDocuments.category));
      return Response.json({ success: true, status, documents });
    }
    if (action === "review-all-application-documents") {
      requireSuperAdmin(access);
      const employeeId = textValue(payload.employeeId, "Employee");
      const decision = textValue(payload.decision, "Decision");
      const rejectionReason = decision === "reject" ? optionalValue(payload.rejectionReason) || "Documents do not meet verification criteria" : null;
      const status = decision === "approve" ? "approved" : "rejected";
      const reviewerIdentifier = access.profile.fullName ? `${access.profile.fullName} (${access.identity.email})` : access.identity.email;
      await db.update(applicationDocuments).set({
        status,
        rejectionReason,
        reviewedBy: reviewerIdentifier,
        reviewedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq(applicationDocuments.employeeId, employeeId));
      await writeAudit(
        db,
        `documents_${decision}_all`,
        "employee",
        employeeId,
        `${decision === "approve" ? "Approved all" : "Rejected all"} documents for employee by ${reviewerIdentifier}`,
        access.identity.email
      );
      const documents = await db.select().from(applicationDocuments).where(eq(applicationDocuments.employeeId, employeeId)).orderBy(asc(applicationDocuments.category));
      return Response.json({ success: true, status, documents });
    }
    if (action === "reupload-application-document") {
      requireModule(access, "employees", "manage");
      const employeeId = textValue(payload.employeeId, "Employee");
      const category = textValue(payload.category, "Category");
      const filename = textValue(payload.filename, "Filename");
      const dataUrl = textValue(payload.dataUrl, "Data URL");
      if (!/^data:(application\/pdf|image\/(png|jpeg|webp));base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
        throw new RequestError("Choose PDF, PNG or JPEG files up to 4 MB each");
      }
      await db.insert(applicationDocuments).values({
        id: crypto.randomUUID(),
        employeeId,
        category,
        filename,
        dataUrl,
        status: "pending_approval",
        rejectionReason: null,
        uploadedBy: access.identity.email,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).onConflictDoUpdate({
        target: [applicationDocuments.employeeId, applicationDocuments.category],
        set: {
          filename,
          dataUrl,
          status: "pending_approval",
          rejectionReason: null,
          uploadedBy: access.identity.email,
          uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
          reviewedBy: null,
          reviewedAt: null
        }
      });
      await writeAudit(
        db,
        "document_reuploaded",
        "employee",
        employeeId,
        `Re-uploaded ${category} (${filename}) for Super Admin review`,
        access.identity.email
      );
      const documents = await db.select().from(applicationDocuments).where(eq(applicationDocuments.employeeId, employeeId)).orderBy(asc(applicationDocuments.category));
      return Response.json({ success: true, documents });
    }
    const user = access.identity;
    const actorEmail = user.email;
    let runId = typeof payload.runId === "string" ? payload.runId : RUN_ID;
    const paymentProtectedActions = /* @__PURE__ */ new Set([
      "update-run-period",
      "set-run-processing-mode",
      "save-attendance",
      "delete-attendance",
      "save-accommodation",
      "delete-accommodation",
      "save-recovery-entry",
      "update-recovery-entry",
      "delete-recovery-entry",
      "finalize-employee-recovery",
      "reopen-employee-recovery",
      "save-room-expense",
      "finalize-room-expense",
      "reopen-room-expense",
      "delete-payroll-run"
    ]);
    if (paymentProtectedActions.has(action) && (await downloadedPayrollItemIds(db, runId)).size)
      throw new RequestError(
        "A bank file was already downloaded for this payroll. Paid attendance and recovery records remain locked; update only the newly added employee salary row.",
        409
      );
    if (action === "save-app-user") {
      await saveAppUser(db, payload, access);
    } else if (action === "save-own-profile") {
      const fullName = textValue(payload.fullName, "Full name");
      const department = optionalValue(payload.department);
      const mobileNumber = optionalValue(payload.mobileNumber);
      await db.update(appUsers).set({
        fullName,
        department,
        mobileNumber,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq(appUsers.id, access.profile.id));
      await writeAudit(
        db,
        "profile_updated",
        "app_user",
        access.profile.id,
        "Updated own profile details",
        actorEmail
      );
    } else if (action === "create-vendor" || action === "save-client") {
      const code = textValue(payload.code, "Client code").toUpperCase();
      if (!/^[A-Z0-9_-]{2,15}$/.test(code))
        throw new RequestError(
          "Client code must contain 2\u201315 letters, numbers, underscores, or hyphens"
        );
      const existingId = optionalValue(payload.id);
      const id = existingId ?? `CLIENT-${crypto.randomUUID()}`;
      const name = textValue(payload.name, "Client name");
      const logoDataUrl = optionalValue(payload.logoDataUrl);
      if (logoDataUrl && (!logoDataUrl.startsWith("data:image/") || logoDataUrl.length > 5e5))
        throw new RequestError("Upload a JPG or PNG logo smaller than 350 KB");
      const values = {
        code,
        name,
        legalName: optionalValue(payload.legalName) ?? name,
        epfCode: optionalValue(payload.epfCode),
        esiCode: optionalValue(payload.esiCode),
        gstin: optionalValue(payload.gstin)?.toUpperCase() ?? null,
        remarks: optionalValue(payload.remarks),
        logoDataUrl
      };
      if (existingId) {
        const [existing] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.id, existingId)).limit(1);
        if (!existing) throw new RequestError("Client not found", 404);
        await db.update(vendors).set(values).where(eq(vendors.id, existingId));
      } else {
        await db.insert(vendors).values({ id, ...values });
        await createDefaultShifts(db, id);
        await createDefaultAccommodationTypes(db, id);
      }
      await writeAudit(
        db,
        existingId ? "client_updated" : "client_created",
        "client",
        id,
        `${existingId ? "Updated" : "Added"} client ${name}`,
        actorEmail
      );
    } else if (action === "create-unit" || action === "save-unit") {
      const vendorId = textValue(payload.vendorId, "Client");
      const [client] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
      if (!client) throw new RequestError("Client not found", 404);
      const existingId = optionalValue(payload.id);
      const id = existingId ?? `UNIT-${crypto.randomUUID()}`;
      const clientName = textValue(payload.clientName, "Employer name");
      const unitName = textValue(payload.unitName, "Unit name");
      const values = {
        vendorId,
        clientName,
        unitName,
        location: textValue(payload.location, "Location"),
        remarks: optionalValue(payload.remarks),
        attendanceCycleStartDay: positiveValue(
          payload.attendanceCycleStartDay ?? 1,
          "Attendance cycle start day",
          31
        ),
        attendanceCycleEndDay: positiveValue(
          payload.attendanceCycleEndDay ?? 31,
          "Attendance cycle end day",
          31
        ),
        attendanceWorkingDays: positiveValue(
          payload.attendanceWorkingDays ?? 26,
          "Attendance working days",
          31
        ),
        overtimeMultiplier: positiveValue(
          payload.overtimeMultiplier ?? 1,
          "OT payment multiplier",
          2
        ),
        employeeCount: positiveValue(
          payload.employeeCount ?? 0,
          "Deployment Scope / Capacity",
          1e5
        ),
        voucherHeader: optionalValue(payload.voucherHeader),
        payslipTitle: optionalValue(payload.payslipTitle),
        payslipSubtitle: optionalValue(payload.payslipSubtitle) ?? clientName,
        payslipAddress: optionalValue(payload.payslipAddress),
        payslipContact: optionalValue(payload.payslipContact),
        payslipFooter: optionalValue(payload.payslipFooter),
        payslipEarningsJson: selectedPayslipFields(
          payload.payslipEarnings,
          earningFields,
          "payslip earning"
        ),
        payslipDeductionsJson: selectedPayslipFields(
          payload.payslipDeductions,
          deductionFields,
          "payslip deduction"
        )
      };
      if (![
        values.attendanceCycleStartDay,
        values.attendanceCycleEndDay,
        values.attendanceWorkingDays
      ].every((value) => Number.isInteger(value) && value >= 1)) {
        throw new RequestError(
          "Attendance cycle days and working days must be whole numbers between 1 and 31"
        );
      }
      if (values.overtimeMultiplier < 1)
        throw new RequestError("OT payment multiplier must be between 1 and 2");
      if (existingId) {
        const [existing] = await db.select().from(clientUnits).where(eq(clientUnits.id, existingId)).limit(1);
        if (!existing) throw new RequestError("Employer unit not found", 404);
        if (existing.vendorId !== vendorId) {
          const assigned = await db.select({ id: employees.id }).from(employees).where(eq(employees.clientUnitId, existingId)).limit(1);
          const runs = await db.select({ id: payrollRuns.id }).from(payrollRuns).where(eq(payrollRuns.clientUnitId, existingId)).limit(1);
          if (assigned.length || runs.length)
            throw new RequestError(
              "An employer unit with employees or payroll history cannot be moved to another client.",
              409
            );
        }
        await db.update(clientUnits).set(values).where(eq(clientUnits.id, existingId));
      } else {
        if (client.status !== "active")
          throw new RequestError(
            "Reactivate the client before adding an employer unit",
            409
          );
        await db.insert(clientUnits).values({ id, ...values });
      }
      await writeAudit(
        db,
        existingId ? "unit_updated" : "unit_created",
        "client_unit",
        id,
        `${existingId ? "Updated" : "Added"} ${clientName} \xB7 ${unitName}`,
        actorEmail
      );
    } else if (action === "update-unit-scope") {
      const unitId = textValue(payload.unitId, "Unit ID");
      const scope = positiveValue(
        payload.employeeCount ?? payload.scope ?? 0,
        "Deployment Scope / Capacity",
        1e5
      );
      const [existing] = await db.select().from(clientUnits).where(eq(clientUnits.id, unitId)).limit(1);
      if (!existing) throw new RequestError("Employer unit not found", 404);
      requireUnitScope(access, unitId, existing.vendorId);
      await db.update(clientUnits).set({ employeeCount: scope }).where(eq(clientUnits.id, unitId));
      await writeAudit(
        db,
        "unit_scope_updated",
        "client_unit",
        unitId,
        `Updated deployment scope for ${existing.clientName} \xB7 ${existing.unitName} to ${scope}`,
        actorEmail
      );
    } else if (action === "save-employee") {
      const vendorId = textValue(payload.vendorId, "Client");
      const unitId = textValue(payload.unitId, "Employer unit");
      const [unit] = await db.select().from(clientUnits).where(eq(clientUnits.id, unitId)).limit(1);
      if (!unit || unit.vendorId !== vendorId)
        throw new RequestError("Select a valid client and employer unit", 404);
      const form = typeof payload.employee === "object" && payload.employee !== null ? payload.employee : payload;
      const values = await assignEmployeeAccommodation(
        db,
        employeeValues(form, vendorId, unitId),
        optionalValue(form.id)
      );
      const documents = form.applicationDocuments;
      if (documents !== void 0) {
        if (!Array.isArray(documents) || documents.length > 20 || JSON.stringify(documents).length > 3e7)
          throw new RequestError("Application attachments exceed the upload limit");
        const categories = /* @__PURE__ */ new Set();
        for (const doc of documents) {
          if (!doc || typeof doc.category !== "string" || !/^(Aadhar (Front|Back) side|PAN Card|Bank Proofs|Candidate Photo|Candidate Signature|Driving License (Front|Back)|Education Qualification certificates [1-5]|Previous Employment proofs [1-3]|Other proofs [1-5])$/.test(doc.category) || categories.has(doc.category) || typeof doc.filename !== "string" || doc.filename.length > 200 || typeof doc.dataUrl !== "string" || doc.dataUrl.length > 56e5 || !/^data:(application\/pdf|image\/(png|jpeg|webp));base64,[A-Za-z0-9+/=]+$/.test(doc.dataUrl))
            throw new RequestError("Choose PDF, PNG or JPEG files up to 4 MB each");
          categories.add(doc.category);
        }
      }
      const rules = await activeRules(db, vendorId);
      const complianceStatus = validationForEmployee(
        { ...values, salaryAmount: values.salaryAmount },
        rules
      ).validationStatus;
      const employeeId = optionalValue(form.id);
      const id = employeeId ?? `EMP-${crypto.randomUUID()}`;
      let existing;
      if (employeeId) {
        [existing] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
        if (!existing || existing.clientUnitId !== unitId)
          throw new RequestError(
            "Employee not found in the selected unit",
            404
          );
        if (existing.roomId && values.roomId && existing.roomId !== values.roomId)
          throw new RequestError(
            "Remove the employee from the present room before allocating another room",
            409
          );
        const updatedPhotoDataUrl = form.photoDataUrl !== void 0 ? optionalValue(form.photoDataUrl) : existing.photoDataUrl;
        await db.update(employees).set({ ...values, photoDataUrl: updatedPhotoDataUrl, complianceStatus }).where(eq(employees.id, employeeId));
      } else {
        await db.insert(employees).values({
          id,
          ...values,
          complianceStatus,
          processingStage: "field_hr_draft"
        });
      }
      const [saved] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
      if (Array.isArray(documents) && documents.length > 0) {
        await Promise.all(
          documents.map(
            (doc) => db.insert(applicationDocuments).values({
              id: crypto.randomUUID(),
              employeeId: id,
              category: doc.category,
              filename: doc.filename,
              dataUrl: doc.dataUrl,
              status: doc.status || "pending_approval",
              rejectionReason: doc.status === "rejected" ? doc.rejectionReason || null : null,
              uploadedBy: access.identity.email,
              uploadedAt: doc.uploadedAt || (/* @__PURE__ */ new Date()).toISOString()
            }).onConflictDoUpdate({
              target: [applicationDocuments.employeeId, applicationDocuments.category],
              set: {
                filename: doc.filename,
                dataUrl: doc.dataUrl,
                status: doc.status || "pending_approval",
                rejectionReason: doc.status === "rejected" ? doc.rejectionReason || null : null,
                uploadedBy: access.identity.email,
                uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
              }
            })
          )
        );
      }
      const payrollFieldsChanged = !employeeId || !existing || existing.salaryAmount !== values.salaryAmount || existing.salaryBasis !== values.salaryBasis || existing.pfApplicable !== values.pfApplicable || existing.esiApplicable !== values.esiApplicable || existing.paymentMode !== values.paymentMode || existing.bankAccountMasked !== values.bankAccountMasked || existing.ifscMasked !== values.ifscMasked || existing.defaultShift !== values.defaultShift || existing.roomId !== values.roomId || existing.accommodationType !== values.accommodationType || existing.dateOfJoining !== values.dateOfJoining;
      if (payrollFieldsChanged) {
        const openRuns = await db.select().from(payrollRuns).where(eq(payrollRuns.clientUnitId, unitId));
        await Promise.all(
          openRuns.filter((candidate) => candidate.status !== "approved").map(async (run) => {
            await addEmployeesToRun(db, run, [saved]);
            await recalculateRun(db, run.id, true);
          })
        );
      }
      await updateUnitCount(db, unitId);
      await writeAudit(
        db,
        employeeId ? "employee_updated" : "employee_created",
        "employee",
        id,
        `${employeeId ? "Updated" : "Added"} ${values.name} (${values.employeeCode})`,
        actorEmail
      );
    } else if (action === "save-accommodation-type") {
      const vendorId = textValue(payload.vendorId, "Client");
      const [client] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
      if (!client) throw new RequestError("Client not found", 404);
      const existingId = optionalValue(payload.id);
      const id = existingId ?? `ACCTYPE-${crypto.randomUUID()}`;
      const name = normalizeAccommodationType(
        textValue(payload.name, "Accommodation type")
      );
      const values = {
        vendorId,
        name,
        remarks: optionalValue(payload.remarks)
      };
      if (existingId) {
        const [existing] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, existingId)).limit(1);
        if (!existing || existing.vendorId !== vendorId)
          throw new RequestError(
            "Accommodation type not found for this client",
            404
          );
        await db.update(accommodationTypes).set(values).where(eq(accommodationTypes.id, existingId));
        if (existing.name !== name) {
          await db.update(employees).set({ accommodationType: name }).where(
            and(
              eq(employees.vendorId, vendorId),
              eq(employees.accommodationType, existing.name)
            )
          );
        }
      } else {
        await db.insert(accommodationTypes).values({ id, ...values });
      }
      await writeAudit(
        db,
        existingId ? "accommodation_type_updated" : "accommodation_type_created",
        "accommodation_type",
        id,
        `${existingId ? "Updated" : "Added"} accommodation type ${name}`,
        actorEmail
      );
    } else if (action === "save-room") {
      const vendorId = textValue(payload.vendorId, "Client");
      const accommodationTypeId = textValue(
        payload.accommodationTypeId,
        "Accommodation type"
      );
      const [type] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, accommodationTypeId)).limit(1);
      if (!type || type.vendorId !== vendorId || type.status !== "active")
        throw new RequestError(
          "Choose an active accommodation type for this client",
          409
        );
      const existingId = optionalValue(payload.id);
      const id = existingId ?? `ROOM-${crypto.randomUUID()}`;
      const capacity = positiveValue(
        payload.capacity ?? 0,
        "Room capacity",
        1e3
      );
      if (!Number.isInteger(capacity))
        throw new RequestError("Room capacity must be a whole number");
      const hostelId = textValue(payload.hostelId, "Hostel / local area");
      {
        const [hostel] = await db.select().from(hostels).where(eq(hostels.id, hostelId)).limit(1);
        const [hostelAccommodationType] = hostel?.accommodationTypeId ? await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, hostel.accommodationTypeId)).limit(1) : [];
        if (!hostel || !hostelAccommodationType || hostelAccommodationType.name !== type.name || hostel.status !== "active")
          throw new RequestError(
            "Choose an active shared hostel or local area under the same accommodation type",
            409
          );
      }
      const values = {
        vendorId,
        accommodationTypeId,
        hostelId,
        rentSettingsJson: typeof payload.rentSettingsJson === "string" ? payload.rentSettingsJson : "{}",
        rentCutoffDay: Math.max(
          1,
          Math.min(
            31,
            Math.round(
              positiveValue(payload.rentCutoffDay ?? 25, "Rent cutoff day", 31)
            )
          )
        ),
        lateJoinRentPercent: positiveValue(
          payload.lateJoinRentPercent ?? 50,
          "Late joining rent percent",
          100
        ),
        roomNumber: textValue(payload.roomNumber, "Room number"),
        capacity,
        address: optionalValue(payload.address),
        remarks: optionalValue(payload.remarks)
      };
      if (existingId) {
        const [existing] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, existingId)).limit(1);
        if (!existing || existing.vendorId !== vendorId)
          throw new RequestError(
            "Accommodation room not found for this client",
            404
          );
        const occupants = await db.select().from(employees).where(
          and(
            eq(employees.roomId, existing.id),
            eq(employees.status, "active")
          )
        );
        for (const occupant of occupants)
          requireUnitScope(access, occupant.clientUnitId, occupant.vendorId);
        if (capacity && occupants.length > capacity)
          throw new RequestError(
            `Room already has ${occupants.length} active employees`,
            409
          );
        await db.update(accommodationRooms).set(values).where(eq(accommodationRooms.id, existing.id));
        await db.update(employees).set({ roomNumber: values.roomNumber, accommodationType: type.name }).where(eq(employees.roomId, existing.id));
      } else {
        await db.insert(accommodationRooms).values({ id, ...values });
      }
      await writeAudit(
        db,
        existingId ? "room_updated" : "room_created",
        "room",
        id,
        `${existingId ? "Updated" : "Added"} ${type.name} room ${values.roomNumber}`,
        actorEmail
      );
    } else if (action === "allocate-room") {
      const employeeId = textValue(payload.employeeId, "Employee");
      const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!employee) throw new RequestError("Employee not found", 404);
      requireUnitScope(access, employee.clientUnitId, employee.vendorId);
      const roomId = optionalValue(payload.roomId);
      if (!roomId) {
        await db.update(employees).set({ roomId: null, roomNumber: null, roomRentAmount: 0 }).where(eq(employees.id, employee.id));
      } else {
        const [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, roomId)).limit(1);
        const [type] = room ? await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, room.accommodationTypeId)).limit(1) : [];
        if (!room || !type)
          throw new RequestError("Accommodation room not found", 404);
        if (employee.roomId && employee.roomId !== roomId)
          throw new RequestError(
            "Remove the employee from the present room before allocating another room",
            409
          );
        const assigned = await assignEmployeeAccommodation(
          db,
          employeeValues(
            {
              ...employee,
              roomId,
              roomNumber: room.roomNumber,
              accommodationType: type.name
            },
            employee.vendorId,
            employee.clientUnitId
          ),
          employee.id
        );
        const roomRentAmount = positiveValue(
          payload.roomRentAmount ?? 0,
          "Individual room rent"
        );
        await db.update(employees).set({
          roomId: assigned.roomId,
          roomNumber: assigned.roomNumber,
          roomRentAmount,
          accommodationType: assigned.accommodationType
        }).where(eq(employees.id, employee.id));
      }
      const employeeRuns = await db.select().from(payrollRuns).where(eq(payrollRuns.clientUnitId, employee.clientUnitId));
      for (const run of employeeRuns.filter(
        (candidate) => candidate.status !== "approved"
      ))
        await recalculateRun(db, run.id, false);
      await writeAudit(
        db,
        "room_allocated",
        "employee",
        employee.id,
        `${roomId ? "Assigned" : "Removed"} room allocation for ${employee.employeeCode}`,
        actorEmail
      );
    } else if (action === "save-room-expense") {
      const roomId = textValue(payload.roomId, "Accommodation room");
      const [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, roomId)).limit(1);
      if (!room) throw new RequestError("Accommodation room not found", 404);
      requireClientScope(access, room.vendorId);
      if (room.status !== "active")
        throw new RequestError(
          "Reactivate the room before adding expenses",
          409
        );
      const payPeriod = periodValue(payload.payPeriod);
      const gasAmount = positiveValue(payload.gasAmount, "Gas expense");
      const rationAmount = positiveValue(payload.rationAmount, "Ration expense");
      const provisionAmount = positiveValue(
        payload.provisionAmount,
        "Provision expense"
      );
      const roomRentAmount = positiveValue(payload.roomRentAmount ?? 0, "Room rent");
      const transportRentAmount = positiveValue(payload.transportRentAmount ?? 0, "Transport rent");
      if (gasAmount + rationAmount + provisionAmount + roomRentAmount + transportRentAmount <= 0)
        throw new RequestError(
          "Enter at least one Gas, Ration, Provision, Room Rent, or Transport recovery amount"
        );
      let resolvedOccupantCount = Math.round(
        positiveValue(payload.occupantCount ?? 0, "Occupant count")
      );
      if (resolvedOccupantCount <= 0) {
        const roomOccupants = await db.select({ id: employees.id }).from(employees).where(
          and(
            eq(employees.status, "active"),
            or(
              eq(employees.roomId, roomId),
              eq(employees.roomNumber, room.roomNumber)
            )
          )
        );
        resolvedOccupantCount = roomOccupants.length;
      }
      const values = {
        gasAmount,
        gasDate: payload.gasDate ? dateValue(payload.gasDate, "Gas cylinder date") : null,
        gasCylinderCount: Math.round(
          positiveValue(payload.gasCylinderCount ?? 0, "Gas cylinder count")
        ),
        gasPaymentReference: optionalValue(payload.gasPaymentReference),
        rationAmount,
        rationDate: payload.rationDate ? dateValue(payload.rationDate, "Ration date") : null,
        rationPaymentReference: optionalValue(payload.rationPaymentReference),
        provisionAmount,
        provisionDate: payload.provisionDate ? dateValue(payload.provisionDate, "Provision date") : null,
        provisionPaymentReference: optionalValue(
          payload.provisionPaymentReference
        ),
        roomRentAmount,
        transportRentAmount,
        occupantCount: resolvedOccupantCount,
        notes: optionalValue(payload.notes),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const existingExpenseId = payload.id ? String(payload.id).trim() : payload.expenseId ? String(payload.expenseId).trim() : "";
      let isUpdate = false;
      if (existingExpenseId) {
        const [targetExpense] = await db.select().from(accommodationRoomExpenses).where(eq(accommodationRoomExpenses.id, existingExpenseId)).limit(1);
        if (targetExpense) {
          isUpdate = true;
          await db.update(accommodationRoomExpenses).set({ roomId, payPeriod, ...values }).where(eq(accommodationRoomExpenses.id, existingExpenseId));
        }
      }
      if (!isUpdate) {
        const targetDate = values.gasDate ?? values.rationDate ?? values.provisionDate;
        let duplicateDraft = null;
        if (targetDate) {
          const draftRows = await db.select().from(accommodationRoomExpenses).where(
            and(
              eq(accommodationRoomExpenses.roomId, roomId),
              eq(accommodationRoomExpenses.payPeriod, payPeriod),
              eq(accommodationRoomExpenses.status, "draft")
            )
          );
          duplicateDraft = draftRows.find(
            (row) => row.gasDate === targetDate || row.rationDate === targetDate || row.provisionDate === targetDate
          );
        }
        if (duplicateDraft) {
          isUpdate = true;
          await db.update(accommodationRoomExpenses).set({ roomId, payPeriod, ...values }).where(eq(accommodationRoomExpenses.id, duplicateDraft.id));
        } else {
          const expenseId = `ROOMEXP-${crypto.randomUUID()}`;
          await db.insert(accommodationRoomExpenses).values({ id: expenseId, roomId, payPeriod, ...values });
        }
      }
      const entryDate = values.gasDate ?? values.rationDate ?? values.provisionDate ?? payPeriod;
      await writeAudit(
        db,
        isUpdate ? "room_expense_updated" : "room_expense_saved",
        "room",
        room.id,
        `${isUpdate ? "Updated" : "Added"} dated room recovery for ${room.roomNumber} on ${entryDate}: Gas \u20B9${gasAmount.toFixed(2)}, Ration \u20B9${rationAmount.toFixed(2)}, Provision \u20B9${provisionAmount.toFixed(2)}`,
        actorEmail
      );
    } else if (action === "delete-room-expense") {
      const expenseId = textValue(payload.expenseId, "Room expense");
      const [expense] = await db.select().from(accommodationRoomExpenses).where(eq(accommodationRoomExpenses.id, expenseId)).limit(1);
      if (!expense) throw new RequestError("Room recovery entry not found", 404);
      if (expense.status === "finalized") {
        if (!access.profile.canApprovePayroll && access.profile.role !== "super_admin") {
          throw new RequestError(
            "Reopen this room recovery before deleting entry",
            409
          );
        }
        const affected = await db.select().from(accommodationCharges).where(eq(accommodationCharges.roomExpenseId, expense.id));
        if (affected.length) {
          await db.update(accommodationCharges).set({
            roomExpenseId: null,
            gasShare: 0,
            rationShare: 0,
            provisionShare: 0
          }).where(eq(accommodationCharges.roomExpenseId, expense.id));
          const affectedRuns = new Set(affected.map((c) => c.runId));
          for (const affectedRunId of affectedRuns) {
            await recalculateRun(db, affectedRunId, false);
          }
        }
      }
      await db.delete(accommodationRoomExpenses).where(eq(accommodationRoomExpenses.id, expenseId));
      await writeAudit(
        db,
        "room_expense_deleted",
        "room",
        expense.roomId,
        `Deleted ${expense.status} room recovery entry ${expenseId}`,
        actorEmail
      );
    } else if (action === "finalize-room-expense") {
      const expenseId = textValue(payload.expenseId, "Room expense");
      const result = await finalizeRoomExpense(db, expenseId, access);
      await writeAudit(
        db,
        "room_expense_finalized",
        "room",
        result.room.id,
        `Finalized ${result.room.roomNumber} shared expenses across ${result.occupants.length} employees`,
        actorEmail
      );
    } else if (action === "reopen-room-expense") {
      const expenseId = textValue(payload.expenseId, "Room recovery entry");
      const [expense] = await db.select().from(accommodationRoomExpenses).where(eq(accommodationRoomExpenses.id, expenseId)).limit(1);
      if (!expense)
        throw new RequestError("Room recovery entry not found", 404);
      const [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, expense.roomId)).limit(1);
      if (!room) throw new RequestError("Accommodation room not found", 404);
      requireClientScope(access, room.vendorId);
      const ledger = await db.select().from(accommodationRoomExpenses).where(
        and(
          eq(accommodationRoomExpenses.roomId, expense.roomId),
          eq(accommodationRoomExpenses.payPeriod, expense.payPeriod)
        )
      );
      const ledgerIds = ledger.map((entry) => entry.id);
      const affected = ledgerIds.length ? await db.select().from(accommodationCharges).where(inArray(accommodationCharges.roomExpenseId, ledgerIds)) : [];
      const affectedRuns = new Set(affected.map((charge) => charge.runId));
      for (const affectedRunId of affectedRuns) {
        const run = await requireRun(db, affectedRunId, true);
        requireUnitScope(access, run.clientUnitId, run.vendorId);
      }
      if (ledgerIds.length)
        await db.update(accommodationCharges).set({
          roomExpenseId: null,
          gasShare: 0,
          rationShare: 0,
          provisionShare: 0
        }).where(inArray(accommodationCharges.roomExpenseId, ledgerIds));
      await db.update(accommodationRoomExpenses).set({
        status: "draft",
        occupantCount: 0,
        finalizedBy: null,
        finalizedAt: null,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(
        and(
          eq(accommodationRoomExpenses.roomId, expense.roomId),
          eq(accommodationRoomExpenses.payPeriod, expense.payPeriod)
        )
      );
      for (const affectedRunId of affectedRuns)
        await recalculateRun(db, affectedRunId, false);
      await writeAudit(
        db,
        "room_expense_reopened",
        "room",
        room.id,
        `Reopened all ${expense.payPeriod} room recovery ledger entries for room ${room.roomNumber}`,
        actorEmail
      );
    } else if (action === "save-shift") {
      const vendorId = textValue(payload.vendorId, "Client");
      const [client] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
      if (!client) throw new RequestError("Client not found", 404);
      const existingId = optionalValue(payload.id);
      const id = existingId ?? `SHIFT-${crypto.randomUUID()}`;
      const name = textValue(payload.name, "Shift name");
      const startTime = textValue(payload.startTime, "Shift start time");
      const endTime = textValue(payload.endTime, "Shift end time");
      if (![startTime, endTime].every(
        (value) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
      ))
        throw new RequestError("Shift times must use the 24-hour HH:MM format");
      const clientUnitId = optionalValue(payload.clientUnitId);
      if (clientUnitId) {
        const [mappedUnit] = await db.select().from(clientUnits).where(eq(clientUnits.id, clientUnitId)).limit(1);
        if (!mappedUnit || mappedUnit.vendorId !== vendorId)
          throw new RequestError(
            "Choose a client location under this group company",
            409
          );
      }
      const wholeMinutes = (value, label, maximum = 1440) => Math.round(positiveValue(value ?? 0, label, maximum));
      const values = {
        vendorId,
        clientUnitId,
        name,
        startTime,
        endTime,
        breakMinutes: wholeMinutes(payload.breakMinutes, "Break minutes"),
        requiredWorkMinutes: wholeMinutes(
          payload.requiredWorkMinutes ?? 480,
          "Required work minutes"
        ),
        lateGraceMinutes: wholeMinutes(
          payload.lateGraceMinutes,
          "Late grace minutes"
        ),
        lateDeductionMinutes: wholeMinutes(
          payload.lateDeductionMinutes,
          "Late deduction minutes"
        ),
        earlyGraceMinutes: wholeMinutes(
          payload.earlyGraceMinutes,
          "Early grace minutes"
        ),
        earlyDeductionMinutes: wholeMinutes(
          payload.earlyDeductionMinutes,
          "Early deduction minutes"
        ),
        otMode: payload.otMode === "fixed" ? "fixed" : "approval",
        fixedOtHours: positiveValue(
          payload.fixedOtHours ?? 0,
          "Fixed OT hours",
          24
        ),
        remarks: optionalValue(payload.remarks)
      };
      if (existingId) {
        const [existing] = await db.select().from(shiftDefinitions).where(eq(shiftDefinitions.id, existingId)).limit(1);
        if (!existing || existing.vendorId !== vendorId)
          throw new RequestError("Shift not found for this client", 404);
        await db.update(shiftDefinitions).set(values).where(eq(shiftDefinitions.id, existingId));
        if (existing.name !== name) {
          await db.update(employees).set({ defaultShift: name }).where(
            and(
              eq(employees.vendorId, vendorId),
              eq(employees.defaultShift, existing.name)
            )
          );
          const assigned = await db.select({ id: employees.id }).from(employees).where(eq(employees.vendorId, vendorId));
          if (assigned.length)
            await db.update(attendanceEntries).set({ shiftCode: name }).where(
              and(
                eq(attendanceEntries.shiftCode, existing.name),
                inArray(
                  attendanceEntries.employeeId,
                  assigned.map((employee) => employee.id)
                )
              )
            );
        }
      } else {
        await db.insert(shiftDefinitions).values({ id, ...values });
      }
      await writeAudit(
        db,
        existingId ? "shift_updated" : "shift_created",
        "shift",
        id,
        `${existingId ? "Updated" : "Added"} ${name} (${startTime}\u2013${endTime})`,
        actorEmail
      );
    } else if (action === "save-remark") {
      const vendorId = textValue(payload.vendorId, "Client");
      const [client] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
      if (!client) throw new RequestError("Client not found", 404);
      const existingId = optionalValue(payload.id);
      const id = existingId ?? `REMARK-${crypto.randomUUID()}`;
      const title = textValue(payload.title, "Remark title");
      const category = textValue(
        payload.category ?? "general",
        "Remark category"
      ).toLowerCase();
      if (![
        "general",
        "attendance",
        "employee",
        "salary",
        "employer",
        "shift"
      ].includes(category))
        throw new RequestError("Choose a supported remark category");
      const values = {
        vendorId,
        title,
        category,
        notes: optionalValue(payload.notes)
      };
      if (existingId) {
        const [existing] = await db.select().from(payrollRemarks).where(eq(payrollRemarks.id, existingId)).limit(1);
        if (!existing || existing.vendorId !== vendorId)
          throw new RequestError("Remark not found for this client", 404);
        await db.update(payrollRemarks).set(values).where(eq(payrollRemarks.id, existingId));
      } else {
        await db.insert(payrollRemarks).values({ id, ...values });
      }
      await writeAudit(
        db,
        existingId ? "remark_updated" : "remark_created",
        "remark",
        id,
        `${existingId ? "Updated" : "Added"} ${category} remark: ${title}`,
        actorEmail
      );
    } else if (action === "advance-employee-workflow") {
      const employeeId = textValue(payload.employeeId, "Employee");
      const [record] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!record) throw new RequestError("Employee not found", 404);
      const transitions = {
        field_hr_draft: {
          next: "field_hr_finalized",
          roles: ["field_hr", "hr_team", "super_admin"]
        },
        field_hr_finalized: {
          next: "payroll_processed",
          roles: ["payroll_team", "super_admin"]
        },
        payroll_processed: {
          next: "hr_manager_reviewed",
          roles: ["hr_team", "super_admin"]
        },
        hr_manager_reviewed: { next: "approved", roles: ["super_admin"] }
      };
      const transition = transitions[record.processingStage];
      if (!transition)
        throw new RequestError("Employee workflow is already approved", 409);
      if (!transition.roles.includes(access.profile.role))
        throw new RequestError(
          "This step requires the assigned hierarchy role",
          403
        );
      await db.update(employees).set({
        processingStage: transition.next,
        finalizedBy: actorEmail,
        finalizedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq(employees.id, employeeId));
      await writeAudit(
        db,
        "employee_workflow_advanced",
        "employee",
        employeeId,
        `${record.name} moved to ${transition.next}`,
        actorEmail
      );
    } else if (action === "mark-employee-left") {
      const employeeId = textValue(payload.employeeId, "Employee");
      const leftDate = dateValue(payload.leftDate, "Left date");
      const finalPayrollMonth = payload.finalPayrollMonth ? String(payload.finalPayrollMonth).trim().slice(0, 7) : null;
      const [record] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!record) throw new RequestError("Employee not found", 404);
      const leftMonth = leftDate.slice(0, 7);
      const effectiveJoiningDate = record.dateOfJoining && leftDate < record.dateOfJoining ? leftDate : record.dateOfJoining;
      await db.update(employees).set({
        status: "inactive",
        dateOfLeaving: leftDate,
        dateOfJoining: effectiveJoiningDate,
        finalPayrollMonth: finalPayrollMonth || null
      }).where(eq(employees.id, employeeId));
      const [updatedEmployee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (finalPayrollMonth) {
        const startMonth = leftMonth < finalPayrollMonth ? leftMonth : finalPayrollMonth;
        const matchingRuns = await db.select().from(payrollRuns).where(
          and(
            eq(payrollRuns.clientUnitId, record.clientUnitId),
            gte(payrollRuns.payPeriod, startMonth),
            lte(payrollRuns.payPeriod, finalPayrollMonth)
          )
        );
        for (const run of matchingRuns.filter((r) => r.status !== "approved")) {
          await addEmployeesToRun(db, run, [updatedEmployee]);
          await recalculateRun(db, run.id, true);
        }
      }
      const activeCutoffMonth = finalPayrollMonth || leftMonth;
      const subsequentRuns = await db.select().from(payrollRuns).where(
        and(
          eq(payrollRuns.clientUnitId, record.clientUnitId),
          gt(payrollRuns.payPeriod, activeCutoffMonth)
        )
      );
      for (const run of subsequentRuns.filter((r) => r.status !== "approved")) {
        const existingItem = await db.select().from(payrollItems).where(
          and(
            eq(payrollItems.runId, run.id),
            eq(payrollItems.employeeId, employeeId)
          )
        ).limit(1);
        if (existingItem.length) {
          await db.delete(payrollItems).where(
            and(
              eq(payrollItems.runId, run.id),
              eq(payrollItems.employeeId, employeeId)
            )
          );
          await recalculateRun(db, run.id, true);
        }
      }
      await updateUnitCount(db, record.clientUnitId);
      await writeAudit(
        db,
        "employee_left",
        "employee",
        employeeId,
        `Marked ${record.name} (${record.employeeCode}) as left on ${leftDate}${finalPayrollMonth ? `; included in payroll & deductions up to ${finalPayrollMonth}` : ""}; all history preserved`,
        actorEmail
      );
    } else if (action === "reactivate-employee") {
      const employeeId = textValue(payload.employeeId, "Employee");
      const [record] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!record) throw new RequestError("Employee not found", 404);
      await db.update(employees).set({ status: "active", dateOfLeaving: null, finalPayrollMonth: null }).where(eq(employees.id, employeeId));
      const [reactivated] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      const openRuns = await db.select().from(payrollRuns).where(eq(payrollRuns.clientUnitId, record.clientUnitId));
      for (const run of openRuns.filter(
        (candidate) => candidate.status !== "approved"
      )) {
        await addEmployeesToRun(db, run, [reactivated]);
        await recalculateRun(db, run.id, true);
      }
      await updateUnitCount(db, record.clientUnitId);
      await writeAudit(
        db,
        "employee_reactivated",
        "employee",
        employeeId,
        `Reactivated ${record.name} (${record.employeeCode})`,
        actorEmail
      );
    } else if (action === "delete-employee" || action === "delete-employees") {
      requireSuperAdmin(
        access,
        "Only a Super Admin can permanently delete employees."
      );
      const rawIds = Array.isArray(payload.employeeIds) ? payload.employeeIds : payload.employeeId ? [payload.employeeId] : [];
      const employeeIds = [
        ...new Set(
          rawIds.map((id) => String(id || "").trim()).filter(Boolean)
        )
      ];
      if (!employeeIds.length)
        throw new RequestError("No employees selected for deletion", 400);
      const targetRecords = await db.select().from(employees).where(inArray(employees.id, employeeIds));
      if (!targetRecords.length)
        throw new RequestError("Selected employee(s) not found", 404);
      const unitIds = [...new Set(targetRecords.map((e) => e.clientUnitId))];
      for (const id of employeeIds) {
        await db.delete(applicationDocuments).where(eq(applicationDocuments.employeeId, id));
        await db.delete(paymentExportBatchItems).where(eq(paymentExportBatchItems.employeeId, id));
        await db.delete(recoveryFinalizations).where(eq(recoveryFinalizations.employeeId, id));
        await db.delete(recoveryEntries).where(eq(recoveryEntries.employeeId, id));
        await db.delete(accommodationCharges).where(eq(accommodationCharges.employeeId, id));
        await db.delete(payrollItems).where(eq(payrollItems.employeeId, id));
        await db.delete(attendanceEntries).where(eq(attendanceEntries.employeeId, id));
        await db.delete(employees).where(eq(employees.id, id));
      }
      for (const unitId of unitIds) {
        await updateUnitCount(db, unitId);
        const affectedRuns = await db.select().from(payrollRuns).where(eq(payrollRuns.clientUnitId, unitId));
        for (const run of affectedRuns.filter((r) => r.status !== "approved")) {
          await recalculateRun(db, run.id, true);
        }
      }
      await writeAudit(
        db,
        "employees_deleted",
        "employee",
        employeeIds.join(","),
        `Permanently deleted ${targetRecords.length} employee(s): ${targetRecords.map((e) => `${e.name} (${e.employeeCode})`).join(", ")}`,
        actorEmail
      );
    } else if (action === "set-record-status") {
      const entityType = textValue(payload.entityType, "Record type");
      const entityId = textValue(payload.entityId, "Record");
      const status = textValue(payload.status, "Status");
      if (!["active", "inactive"].includes(status))
        throw new RequestError("Status must be active or inactive");
      if (entityType === "app_user") {
        const [record] = await db.select().from(appUsers).where(eq(appUsers.id, entityId)).limit(1);
        if (!record) throw new RequestError("User profile not found", 404);
        if (record.email === access.identity.email.toLowerCase() && status === "inactive")
          throw new RequestError(
            "You cannot make your own Super Admin profile inactive",
            409
          );
        if (record.role === "super_admin" && record.status === "active" && status === "inactive" && await activeSuperAdminCount(db, record.id) === 0)
          throw new RequestError(
            "Create another active Super Admin before deactivating this profile",
            409
          );
        await db.update(appUsers).set({ status, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(appUsers.id, entityId));
        await writeAudit(
          db,
          `user_${status}`,
          "app_user",
          entityId,
          `${status === "active" ? "Reactivated" : "Made inactive"} user ${record.email}`,
          actorEmail
        );
      } else if (entityType === "client") {
        const [record] = await db.select().from(vendors).where(eq(vendors.id, entityId)).limit(1);
        if (!record) throw new RequestError("Client not found", 404);
        await db.update(vendors).set({ status }).where(eq(vendors.id, entityId));
        await writeAudit(
          db,
          `client_${status}`,
          "client",
          entityId,
          `${status === "active" ? "Reactivated" : "Made inactive"} client ${record.name}`,
          actorEmail
        );
      } else if (entityType === "unit") {
        const [record] = await db.select().from(clientUnits).where(eq(clientUnits.id, entityId)).limit(1);
        if (!record) throw new RequestError("Employer unit not found", 404);
        await db.update(clientUnits).set({ status }).where(eq(clientUnits.id, entityId));
        await writeAudit(
          db,
          `unit_${status}`,
          "client_unit",
          entityId,
          `${status === "active" ? "Reactivated" : "Made inactive"} employer unit ${record.clientName} \xB7 ${record.unitName}`,
          actorEmail
        );
      } else if (entityType === "employee") {
        throw new RequestError(
          status === "inactive" ? "Use Put left date for employees." : "Use Reactivate employee to clear the left date.",
          409
        );
      } else if (entityType === "accommodation_type") {
        const [record] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, entityId)).limit(1);
        if (!record)
          throw new RequestError("Accommodation type not found", 404);
        if (status === "inactive") {
          const assigned = await db.select({ id: employees.id }).from(employees).where(
            and(
              eq(employees.vendorId, record.vendorId),
              eq(employees.accommodationType, record.name),
              eq(employees.status, "active")
            )
          ).limit(1);
          if (assigned.length)
            throw new RequestError(
              "Reassign active employees before deactivating this accommodation type",
              409
            );
          await db.update(accommodationRooms).set({ status: "inactive" }).where(eq(accommodationRooms.accommodationTypeId, record.id));
        }
        await db.update(accommodationTypes).set({ status }).where(eq(accommodationTypes.id, entityId));
        await writeAudit(
          db,
          `accommodation_type_${status}`,
          "accommodation_type",
          entityId,
          `${status === "active" ? "Reactivated" : "Made inactive"} accommodation type ${record.name}`,
          actorEmail
        );
      } else if (entityType === "room") {
        const [record] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, entityId)).limit(1);
        if (!record)
          throw new RequestError("Accommodation room not found", 404);
        if (status === "inactive") {
          const occupants = await db.select({ id: employees.id }).from(employees).where(
            and(
              eq(employees.roomId, record.id),
              eq(employees.status, "active")
            )
          ).limit(1);
          if (occupants.length)
            throw new RequestError(
              "Move all active employees before deactivating this room",
              409
            );
        } else {
          const [type] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, record.accommodationTypeId)).limit(1);
          if (!type || type.status !== "active")
            throw new RequestError(
              "Reactivate the accommodation type before reactivating this room",
              409
            );
        }
        await db.update(accommodationRooms).set({ status }).where(eq(accommodationRooms.id, entityId));
        await writeAudit(
          db,
          `room_${status}`,
          "room",
          entityId,
          `${status === "active" ? "Reactivated" : "Made inactive"} room ${record.roomNumber}`,
          actorEmail
        );
      } else if (entityType === "shift") {
        const [record] = await db.select().from(shiftDefinitions).where(eq(shiftDefinitions.id, entityId)).limit(1);
        if (!record) throw new RequestError("Shift not found", 404);
        if (status === "inactive") {
          const assigned = await db.select({ id: employees.id }).from(employees).where(
            and(
              eq(employees.vendorId, record.vendorId),
              eq(employees.defaultShift, record.name),
              eq(employees.status, "active")
            )
          );
          if (assigned.length) {
            const alternatives = await db.select().from(shiftDefinitions).where(
              and(
                eq(shiftDefinitions.vendorId, record.vendorId),
                eq(shiftDefinitions.status, "active")
              )
            );
            const replacement = alternatives.find(
              (shift) => shift.id !== record.id
            );
            if (!replacement)
              throw new RequestError(
                "Create another active shift before deactivating a shift assigned to employees",
                409
              );
            await db.update(employees).set({ defaultShift: replacement.name }).where(
              and(
                eq(employees.vendorId, record.vendorId),
                eq(employees.defaultShift, record.name),
                eq(employees.status, "active")
              )
            );
          }
        }
        await db.update(shiftDefinitions).set({ status }).where(eq(shiftDefinitions.id, entityId));
        await writeAudit(
          db,
          `shift_${status}`,
          "shift",
          entityId,
          `${status === "active" ? "Reactivated" : "Made inactive"} shift ${record.name}`,
          actorEmail
        );
      } else if (entityType === "remark") {
        const [record] = await db.select().from(payrollRemarks).where(eq(payrollRemarks.id, entityId)).limit(1);
        if (!record) throw new RequestError("Remark not found", 404);
        await db.update(payrollRemarks).set({ status }).where(eq(payrollRemarks.id, entityId));
        await writeAudit(
          db,
          `remark_${status}`,
          "remark",
          entityId,
          `${status === "active" ? "Reactivated" : "Made inactive"} remark ${record.title}`,
          actorEmail
        );
      } else {
        throw new RequestError(`Unsupported record type: ${entityType}`);
      }
    } else if (action === "delete-record") {
      const entityType = textValue(payload.entityType, "Record type");
      const entityId = textValue(payload.entityId, "Record");
      if (entityType === "app_user") {
        const [record] = await db.select().from(appUsers).where(eq(appUsers.id, entityId)).limit(1);
        if (!record) throw new RequestError("User profile not found", 404);
        if (record.email === access.identity.email.toLowerCase())
          throw new RequestError(
            "You cannot delete your own Super Admin profile",
            409
          );
        if (record.role === "super_admin" && record.status === "active" && await activeSuperAdminCount(db, record.id) === 0)
          throw new RequestError(
            "Create another active Super Admin before deleting this profile",
            409
          );
        await db.delete(appUsers).where(eq(appUsers.id, entityId));
        await writeAudit(
          db,
          "user_deleted",
          "app_user",
          entityId,
          `Deleted access profile ${record.email}`,
          actorEmail
        );
      } else if (entityType === "employee") {
        throw new RequestError(
          "Employee records cannot be deleted. Enter a left date to preserve attendance and payroll history.",
          409
        );
      } else if (entityType === "unit") {
        const [record] = await db.select().from(clientUnits).where(eq(clientUnits.id, entityId)).limit(1);
        if (!record) throw new RequestError("Employer unit not found", 404);
        const assigned = await db.select({ id: employees.id }).from(employees).where(eq(employees.clientUnitId, entityId)).limit(1);
        const history = await db.select({ id: payrollRuns.id }).from(payrollRuns).where(eq(payrollRuns.clientUnitId, entityId)).limit(1);
        if (assigned.length || history.length)
          throw new RequestError(
            "This employer unit has employees or payroll history. Remove those records first, or make the employer unit inactive.",
            409
          );
        await db.delete(clientUnits).where(eq(clientUnits.id, entityId));
        const allUsersWithUnit = await db.select().from(appUsers);
        for (const user2 of allUsersWithUnit) {
          const currentScope = normalizedScope(user2.unitScopeJson);
          if (currentScope.includes(entityId)) {
            const updatedScope = currentScope.filter((id) => id !== entityId);
            await db.update(appUsers).set({
              unitScopeJson: JSON.stringify(updatedScope),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }).where(eq(appUsers.id, user2.id));
          }
        }
        await writeAudit(
          db,
          "unit_deleted",
          "client_unit",
          entityId,
          `Deleted employer unit ${record.clientName} \xB7 ${record.unitName}`,
          actorEmail
        );
      } else if (entityType === "client") {
        const [record] = await db.select().from(vendors).where(eq(vendors.id, entityId)).limit(1);
        if (!record) throw new RequestError("Client not found", 404);
        const units = await db.select({ id: clientUnits.id }).from(clientUnits).where(eq(clientUnits.vendorId, entityId)).limit(1);
        if (units.length)
          throw new RequestError(
            "This client still has employer units. Delete the units first, or make the client inactive.",
            409
          );
        const rooms = await db.select({ id: accommodationRooms.id }).from(accommodationRooms).where(eq(accommodationRooms.vendorId, entityId));
        if (rooms.length) {
          const roomHistory = await db.select({ id: accommodationRoomExpenses.id }).from(accommodationRoomExpenses).where(
            inArray(
              accommodationRoomExpenses.roomId,
              rooms.map((room) => room.id)
            )
          ).limit(1);
          if (roomHistory.length)
            throw new RequestError(
              "This client has room expense history. Make the client inactive instead of deleting it.",
              409
            );
          await db.delete(accommodationRooms).where(eq(accommodationRooms.vendorId, entityId));
        }
        await db.delete(accommodationTypes).where(eq(accommodationTypes.vendorId, entityId));
        await db.delete(payrollRules).where(eq(payrollRules.vendorId, entityId));
        await db.delete(payrollRemarks).where(eq(payrollRemarks.vendorId, entityId));
        await db.delete(shiftDefinitions).where(eq(shiftDefinitions.vendorId, entityId));
        await db.delete(vendors).where(eq(vendors.id, entityId));
        const allUsersWithClient = await db.select().from(appUsers);
        for (const user2 of allUsersWithClient) {
          const currentScope = normalizedScope(user2.clientScopeJson);
          if (currentScope.includes(entityId)) {
            const updatedScope = currentScope.filter((id) => id !== entityId);
            await db.update(appUsers).set({
              clientScopeJson: JSON.stringify(updatedScope),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }).where(eq(appUsers.id, user2.id));
          }
        }
        await writeAudit(
          db,
          "client_deleted",
          "client",
          entityId,
          `Deleted client ${record.name}`,
          actorEmail
        );
      } else if (entityType === "shift") {
        const [record] = await db.select().from(shiftDefinitions).where(eq(shiftDefinitions.id, entityId)).limit(1);
        if (!record) throw new RequestError("Shift not found", 404);
        const assigned = await db.select({ id: employees.id }).from(employees).where(
          and(
            eq(employees.vendorId, record.vendorId),
            eq(employees.defaultShift, record.name)
          )
        );
        if (assigned.length) {
          const alternatives = await db.select().from(shiftDefinitions).where(
            and(
              eq(shiftDefinitions.vendorId, record.vendorId),
              eq(shiftDefinitions.status, "active")
            )
          );
          const replacement = alternatives.find(
            (shift) => shift.id !== record.id
          );
          if (!replacement)
            throw new RequestError(
              "Create another active shift before deleting a shift assigned to employees",
              409
            );
          await db.update(employees).set({ defaultShift: replacement.name }).where(
            and(
              eq(employees.vendorId, record.vendorId),
              eq(employees.defaultShift, record.name)
            )
          );
        }
        await db.delete(shiftDefinitions).where(eq(shiftDefinitions.id, entityId));
        await writeAudit(
          db,
          "shift_deleted",
          "shift",
          entityId,
          `Deleted shift ${record.name}; existing attendance history was preserved`,
          actorEmail
        );
      } else if (entityType === "remark") {
        const [record] = await db.select().from(payrollRemarks).where(eq(payrollRemarks.id, entityId)).limit(1);
        if (!record) throw new RequestError("Remark not found", 404);
        await db.delete(payrollRemarks).where(eq(payrollRemarks.id, entityId));
        await writeAudit(
          db,
          "remark_deleted",
          "remark",
          entityId,
          `Deleted ${record.category} remark ${record.title}`,
          actorEmail
        );
      } else if (entityType === "accommodation_type") {
        const [record] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, entityId)).limit(1);
        if (!record)
          throw new RequestError("Accommodation type not found", 404);
        const rooms = await db.select({ id: accommodationRooms.id }).from(accommodationRooms).where(eq(accommodationRooms.accommodationTypeId, entityId)).limit(1);
        const assigned = await db.select({ id: employees.id }).from(employees).where(
          and(
            eq(employees.vendorId, record.vendorId),
            eq(employees.accommodationType, record.name)
          )
        ).limit(1);
        if (rooms.length || assigned.length)
          throw new RequestError(
            "Remove related rooms and employee assignments before deleting this accommodation type",
            409
          );
        await db.delete(accommodationTypes).where(eq(accommodationTypes.id, entityId));
        await writeAudit(
          db,
          "accommodation_type_deleted",
          "accommodation_type",
          entityId,
          `Deleted accommodation type ${record.name}`,
          actorEmail
        );
      } else if (entityType === "room") {
        const [record] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, entityId)).limit(1);
        if (!record)
          throw new RequestError("Accommodation room not found", 404);
        const occupants = await db.select({ id: employees.id }).from(employees).where(eq(employees.roomId, entityId)).limit(1);
        const history = await db.select({ id: accommodationRoomExpenses.id }).from(accommodationRoomExpenses).where(eq(accommodationRoomExpenses.roomId, entityId)).limit(1);
        if (occupants.length || history.length)
          throw new RequestError(
            "Remove employee allocations and expense history before deleting this room; otherwise deactivate it",
            409
          );
        await db.delete(accommodationRooms).where(eq(accommodationRooms.id, entityId));
        await writeAudit(
          db,
          "room_deleted",
          "room",
          entityId,
          `Deleted accommodation room ${record.roomNumber}`,
          actorEmail
        );
      } else {
        throw new RequestError(`Unsupported record type: ${entityType}`);
      }
    } else if (action === "create-run") {
      const vendorId = textValue(payload.vendorId, "Payroll entity");
      const unitId = textValue(payload.unitId, "Client unit");
      const period = periodValue(payload.payPeriod);
      const existing = await db.select().from(payrollRuns).where(
        and(
          eq(payrollRuns.clientUnitId, unitId),
          eq(payrollRuns.payPeriod, period)
        )
      ).limit(1);
      if (existing.length)
        throw new RequestError(
          `A payroll run already exists for ${period}`,
          409
        );
      const [unit] = await db.select().from(clientUnits).where(
        and(eq(clientUnits.id, unitId), eq(clientUnits.vendorId, vendorId))
      ).limit(1);
      if (!unit) throw new RequestError("Employer unit not found", 404);
      const cycle = unitCycleRange(
        period,
        unit.attendanceCycleStartDay,
        unit.attendanceCycleEndDay
      );
      const options = {
        ...payload,
        periodStart: payload.periodStart || cycle.periodStart,
        periodEnd: payload.periodEnd || cycle.periodEnd,
        workingDays: payload.workingDays || unit.attendanceWorkingDays
      };
      const run = await createRun(db, vendorId, unitId, period, options);
      runId = run.id;
      await writeAudit(
        db,
        "run_created",
        "payroll_run",
        run.id,
        `Created ${period} payroll (${run.periodStart} to ${run.periodEnd}; ${run.workingDays} working days) with ${run.employeeCount} employees`,
        actorEmail
      );
    } else if (action === "update-run-period") {
      const run = await requireRun(db, runId, true);
      const values = runPeriodValues(run.payPeriod, payload, run.workingDays);
      const processingMode = payload.processingMode === "salary_import" ? "salary_import" : payload.processingMode === "attendance" ? "attendance" : run.processingMode;
      await db.update(payrollRuns).set({ ...values, processingMode, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(payrollRuns.id, run.id));
      await recalculateRun(db, run.id, true);
      await writeAudit(
        db,
        "payroll_period_updated",
        "payroll_run",
        run.id,
        `Updated payroll period to ${values.periodStart}\u2013${values.periodEnd} with ${values.workingDays} working days (${processingMode})`,
        actorEmail
      );
    } else if (action === "set-run-processing-mode") {
      const run = await requireRun(db, runId, true);
      const processingMode = payload.processingMode === "salary_import" ? "salary_import" : "attendance";
      await db.update(payrollRuns).set({ processingMode, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(payrollRuns.id, run.id));
      await recalculateRun(db, run.id, true);
      await writeAudit(
        db,
        "run_mode_updated",
        "payroll_run",
        run.id,
        `Switched payroll processing mode to ${processingMode === "salary_import" ? "Imported Salary" : "Application Attendance"}`,
        actorEmail
      );
    } else if (action === "save-attendance") {
      const run = await requireRun(db, runId, true);
      const employeeId = textValue(payload.employeeId, "Employee");
      const attendanceDate = textValue(
        payload.attendanceDate,
        "Attendance date"
      );
      const { start, end } = periodRange(
        run.payPeriod,
        run.periodStart,
        run.periodEnd
      );
      if (attendanceDate < start || attendanceDate >= end)
        throw new RequestError(
          "Attendance date must belong to the selected custom payroll period"
        );
      const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!employee || employee.clientUnitId !== run.clientUnitId)
        throw new RequestError(
          "Employee does not belong to this payroll run",
          404
        );
      const statusCode = textValue(
        payload.statusCode,
        "Attendance status"
      ).toUpperCase();
      if (!ATTENDANCE_CODES.includes(
        statusCode
      ))
        throw new RequestError("Unsupported attendance status");
      if (employee.status !== "active")
        throw new RequestError(
          "Reactivate the employee before recording attendance",
          409
        );
      const shiftCode = optionalValue(payload.shiftCode) ?? employee.defaultShift;
      const [shift] = await db.select().from(shiftDefinitions).where(
        and(
          eq(shiftDefinitions.vendorId, employee.vendorId),
          eq(shiftDefinitions.name, shiftCode)
        )
      ).limit(1);
      const punchIn = optionalValue(payload.punchIn), punchOut = optionalValue(payload.punchOut);
      const minutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
      let workedMinutes = 0, deductionMinutes = 0;
      if (shift && punchIn && punchOut) {
        const start2 = minutes(shift.startTime), actualIn = minutes(punchIn);
        let end2 = minutes(shift.endTime), actualOut = minutes(punchOut);
        if (end2 <= start2) end2 += 1440;
        if (actualOut <= actualIn) actualOut += 1440;
        workedMinutes = Math.max(0, actualOut - actualIn - shift.breakMinutes);
        if (actualIn - start2 > shift.lateGraceMinutes)
          deductionMinutes += shift.lateDeductionMinutes;
        if (end2 - actualOut > shift.earlyGraceMinutes)
          deductionMinutes += shift.earlyDeductionMinutes;
        if (workedMinutes < shift.requiredWorkMinutes)
          deductionMinutes += shift.requiredWorkMinutes - workedMinutes;
      }
      const requestedOt = positiveValue(
        payload.overtimeHours,
        "Overtime hours",
        24
      );
      const overtimeHours = shift?.otMode === "fixed" ? shift.fixedOtHours : requestedOt;
      const values = {
        statusCode,
        shiftCode,
        punchIn,
        punchOut,
        workedHours: roundMoney(workedMinutes / 60),
        deductionHours: roundMoney(deductionMinutes / 60),
        overtimeHours,
        remarks: optionalValue(payload.remarks),
        source: "manual",
        updatedBy: actorEmail,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const [existing] = await db.select().from(attendanceEntries).where(
        and(
          eq(attendanceEntries.employeeId, employeeId),
          eq(attendanceEntries.attendanceDate, attendanceDate)
        )
      ).limit(1);
      if (existing)
        await db.update(attendanceEntries).set(values).where(eq(attendanceEntries.id, existing.id));
      else
        await db.insert(attendanceEntries).values({ employeeId, attendanceDate, ...values });
      await recalculateRun(db, runId, true, employeeId);
      await writeAudit(
        db,
        "attendance_saved",
        "attendance",
        employeeId,
        `Updated ${employee.employeeCode} attendance on ${attendanceDate} to ${statusCode}`,
        actorEmail
      );
    } else if (action === "delete-attendance") {
      const run = await requireRun(db, runId, true);
      const employeeId = textValue(payload.employeeId, "Employee");
      const attendanceDate = textValue(
        payload.attendanceDate,
        "Attendance date"
      );
      const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!employee || employee.clientUnitId !== run.clientUnitId)
        throw new RequestError(
          "Employee does not belong to this payroll run",
          404
        );
      await db.delete(attendanceEntries).where(
        and(
          eq(attendanceEntries.employeeId, employeeId),
          eq(attendanceEntries.attendanceDate, attendanceDate)
        )
      );
      await recalculateRun(db, runId, true, employeeId);
      await writeAudit(
        db,
        "attendance_deleted",
        "attendance",
        employeeId,
        `Deleted ${employee.employeeCode} attendance on ${attendanceDate}`,
        actorEmail
      );
    } else if (action === "save-payroll-item") {
      await requireRun(db, runId, true);
      const itemId = textValue(payload.itemId, "Employee salary record");
      const [item] = await db.select().from(payrollItems).where(and(eq(payrollItems.id, itemId), eq(payrollItems.runId, runId))).limit(1);
      if (!item) throw new RequestError("Salary record not found", 404);
      await requirePayrollItemPaymentUnlocked(db, runId, item.id);
      const fields = typeof payload.fields === "object" && payload.fields !== null ? payload.fields : {};
      const update = {};
      for (const field of [...earningFields, ...deductionFields])
        if (Object.hasOwn(fields, field))
          update[field] = positiveValue(fields[field], field);
      for (const field of [
        "presentDays",
        "payableDays",
        "overtimeHours",
        "fixedWorkingDays",
        "nfhDays",
        "compOffDays",
        "onDutyDays",
        "sundayDays",
        "plDays",
        "clDays",
        "slDays"
      ])
        if (Object.hasOwn(fields, field))
          update[field] = positiveValue(fields[field], field);
      const totals = payrollTotals({ ...item, ...update });
      await db.update(payrollItems).set({
        ...update,
        grossEarnings: totals.grossEarnings,
        totalDeductions: totals.totalDeductions,
        netPayable: totals.netPayable
      }).where(eq(payrollItems.id, itemId));
      await recalculateRun(db, runId, false);
      await writeAudit(
        db,
        "salary_updated",
        "payroll_item",
        itemId,
        "Updated employee earnings and deductions",
        actorEmail
      );
    } else if (action === "save-recovery-entry") {
      const run = await requireRun(db, runId, true);
      const rawIds = Array.isArray(payload.employeeIds) ? payload.employeeIds.map(String).filter(Boolean) : payload.employeeId ? [String(payload.employeeId)] : [];
      if (!rawIds.length)
        throw new RequestError("Select at least one candidate for recovery", 400);
      const targetEmployees = await db.select().from(employees).where(
        and(
          eq(employees.clientUnitId, run.clientUnitId),
          inArray(employees.id, rawIds)
        )
      );
      if (!targetEmployees.length)
        throw new RequestError("Selected employee(s) not found in this unit", 404);
      const finalizedRows = await db.select({ employeeId: recoveryFinalizations.employeeId }).from(recoveryFinalizations).where(
        and(
          eq(recoveryFinalizations.runId, runId),
          inArray(
            recoveryFinalizations.employeeId,
            targetEmployees.map((e) => e.id)
          )
        )
      );
      const finalizedSet = new Set(finalizedRows.map((r) => r.employeeId));
      if (finalizedSet.size > 0)
        throw new RequestError(
          "Reopen employee recovery before adding deductions for finalized employees",
          409
        );
      const recoveryDate = dateValue(payload.recoveryDate, "Recovery date");
      const { start, end } = periodRange(
        run.payPeriod,
        run.periodStart,
        run.periodEnd
      );
      if (recoveryDate < start || recoveryDate >= end)
        throw new RequestError(
          `Recovery date must be inside the salary cycle ${start} to ${new Date((/* @__PURE__ */ new Date(`${end}T00:00:00Z`)).getTime() - 864e5).toISOString().slice(0, 10)}`
        );
      let itemsToInsert = [];
      if (payload.recoveryType === "roomPackage" && Array.isArray(payload.entries)) {
        itemsToInsert = payload.entries.map((e) => ({
          recoveryType: String(e.recoveryType || ""),
          amount: roundMoney(Number(e.amount) || 0)
        })).filter(
          (e) => e.amount > 0 && datedRecoveryFields.includes(
            e.recoveryType
          )
        );
        if (!itemsToInsert.length)
          throw new RequestError("Enter at least one room recovery amount greater than zero", 400);
      } else {
        const recoveryType = textValue(payload.recoveryType, "Recovery type");
        if (!datedRecoveryFields.includes(
          recoveryType
        ))
          throw new RequestError("Unsupported recovery type");
        const amount = positiveValue(payload.amount, "Recovery amount");
        if (amount <= 0)
          throw new RequestError("Recovery amount must be greater than zero");
        itemsToInsert = [{ recoveryType, amount }];
      }
      const insertRows = [];
      for (const emp of targetEmployees) {
        for (const item of itemsToInsert) {
          const id = `REC-${crypto.randomUUID()}`;
          insertRows.push({
            id,
            runId,
            employeeId: emp.id,
            recoveryDate,
            recoveryType: item.recoveryType,
            amount: item.amount,
            reference: optionalValue(payload.reference),
            notes: optionalValue(payload.notes),
            createdBy: actorEmail
          });
        }
      }
      for (let i = 0; i < insertRows.length; i += 50) {
        await db.insert(recoveryEntries).values(insertRows.slice(i, i + 50));
      }
      if (targetEmployees.length === 1) {
        const employeeId = targetEmployees[0].id;
        await syncDatedRecoveries(db, runId, employeeId);
      } else {
        await syncDatedRecoveriesBulk(
          db,
          runId,
          targetEmployees.map((e) => e.id)
        );
      }
      const recoverySummary = itemsToInsert.map((it) => `${it.recoveryType} \u20B9${it.amount.toFixed(2)}`).join(", ");
      await writeAudit(
        db,
        "recovery_added",
        "employee",
        targetEmployees.map((e) => e.id).join(","),
        `Added recovery (${recoverySummary}) for ${targetEmployees.length} candidate(s) on ${recoveryDate}`,
        actorEmail
      );
    } else if (action === "delete-recovery-entry") {
      await requireRun(db, runId, true);
      const recoveryId = textValue(payload.recoveryId, "Recovery entry");
      const [entry] = await db.select().from(recoveryEntries).where(
        and(
          eq(recoveryEntries.id, recoveryId),
          eq(recoveryEntries.runId, runId)
        )
      ).limit(1);
      if (!entry) throw new RequestError("Recovery entry not found", 404);
      const [finalized] = await db.select().from(recoveryFinalizations).where(
        and(
          eq(recoveryFinalizations.runId, runId),
          eq(recoveryFinalizations.employeeId, entry.employeeId)
        )
      ).limit(1);
      if (finalized)
        throw new RequestError(
          "Reopen this employee recovery before deleting deductions",
          409
        );
      await db.delete(recoveryEntries).where(eq(recoveryEntries.id, recoveryId));
      await syncDatedRecoveries(db, runId, entry.employeeId);
      await writeAudit(
        db,
        "recovery_deleted",
        "employee",
        entry.employeeId,
        `Deleted dated ${entry.recoveryType} recovery`,
        actorEmail
      );
    } else if (action === "update-recovery-entry") {
      await requireRun(db, runId, true);
      const recoveryId = textValue(payload.recoveryId, "Recovery entry");
      const [entry] = await db.select().from(recoveryEntries).where(
        and(
          eq(recoveryEntries.id, recoveryId),
          eq(recoveryEntries.runId, runId)
        )
      ).limit(1);
      if (!entry) throw new RequestError("Recovery entry not found", 404);
      const [finalized] = await db.select().from(recoveryFinalizations).where(
        and(
          eq(recoveryFinalizations.runId, runId),
          eq(recoveryFinalizations.employeeId, entry.employeeId)
        )
      ).limit(1);
      if (finalized)
        throw new RequestError(
          "Reopen this employee recovery before editing deductions",
          409
        );
      const recoveryDate = dateValue(payload.recoveryDate, "Recovery date");
      const recoveryType = textValue(payload.recoveryType, "Recovery type");
      if (!datedRecoveryFields.includes(
        recoveryType
      ))
        throw new RequestError("Unsupported recovery type");
      const numAmount = Number(payload.amount);
      const amount = Number.isFinite(numAmount) ? roundMoney(Math.max(0, numAmount)) : 0;
      if (amount <= 0) {
        await db.delete(recoveryEntries).where(eq(recoveryEntries.id, recoveryId));
        await syncDatedRecoveries(db, runId, entry.employeeId);
        await writeAudit(
          db,
          "recovery_deleted",
          "employee",
          entry.employeeId,
          `Zeroed out and removed dated ${entry.recoveryType} recovery`,
          actorEmail
        );
      } else {
        await db.update(recoveryEntries).set({
          recoveryDate,
          recoveryType,
          amount,
          reference: optionalValue(payload.reference),
          notes: optionalValue(payload.notes)
        }).where(eq(recoveryEntries.id, recoveryId));
        await syncDatedRecoveries(db, runId, entry.employeeId);
        await writeAudit(
          db,
          "recovery_updated",
          "employee",
          entry.employeeId,
          `Updated dated ${recoveryType} recovery to \u20B9${amount.toFixed(2)} on ${recoveryDate}`,
          actorEmail
        );
      }
    } else if (action === "finalize-employee-recovery") {
      if (!access.profile.canApprovePayroll && access.profile.role !== "super_admin")
        throw new RequestError(
          "Final recovery approval requires Super Admin or authorised approval access",
          403
        );
      const run = await requireRun(db, runId, true);
      const rawIds = Array.isArray(payload.employeeIds) ? payload.employeeIds.map(String).filter(Boolean) : payload.employeeId ? [String(payload.employeeId)] : [];
      if (!rawIds.length)
        throw new RequestError("Select at least one candidate to finalize recovery", 400);
      const targetEmployees = await db.select().from(employees).where(
        and(
          eq(employees.clientUnitId, run.clientUnitId),
          inArray(employees.id, rawIds)
        )
      );
      if (!targetEmployees.length)
        throw new RequestError("No matching employees found in this payroll unit", 404);
      for (const employee of targetEmployees) {
        if (employee.roomId) {
          const [draftRoomExpense] = await db.select({ id: accommodationRoomExpenses.id }).from(accommodationRoomExpenses).where(
            and(
              eq(accommodationRoomExpenses.roomId, employee.roomId),
              eq(accommodationRoomExpenses.payPeriod, run.payPeriod),
              eq(accommodationRoomExpenses.status, "draft")
            )
          ).limit(1);
          if (draftRoomExpense) {
            const roomResult = await finalizeRoomExpense(
              db,
              draftRoomExpense.id,
              access
            );
            await writeAudit(
              db,
              "room_expense_auto_finalized",
              "room",
              roomResult.room.id,
              `Allocated room-wise recovery before finalizing ${employee.employeeCode}`,
              actorEmail
            );
          }
        }
      }
      const entries = await db.select().from(recoveryEntries).where(
        and(
          eq(recoveryEntries.runId, runId),
          inArray(
            recoveryEntries.employeeId,
            targetEmployees.map((e) => e.id)
          )
        )
      );
      void entries;
      const existingFinalizations = await db.select().from(recoveryFinalizations).where(
        and(
          eq(recoveryFinalizations.runId, runId),
          inArray(
            recoveryFinalizations.employeeId,
            targetEmployees.map((e) => e.id)
          )
        )
      );
      const existingFinSet = new Set(
        existingFinalizations.map((f) => f.employeeId)
      );
      const newFinalizations = [];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      for (const emp of targetEmployees) {
        if (existingFinSet.has(emp.id)) continue;
        const voucherNumber = `DRV-${run.payPeriod.replace("-", "")}-${emp.employeeCode}`;
        newFinalizations.push({
          id: `RECFIN-${crypto.randomUUID()}`,
          runId,
          employeeId: emp.id,
          voucherNumber,
          finalizedBy: actorEmail,
          finalizedAt: now
        });
      }
      if (newFinalizations.length) {
        for (let i = 0; i < newFinalizations.length; i += 50) {
          await db.insert(recoveryFinalizations).values(newFinalizations.slice(i, i + 50));
        }
      }
      await recalculateRun(db, runId, false);
      await writeAudit(
        db,
        "recovery_finalized",
        "employee",
        targetEmployees.map((e) => e.id).join(","),
        `Finalized deductions and generated voucher(s) for ${targetEmployees.length} employee(s)`,
        actorEmail
      );
    } else if (action === "reopen-employee-recovery") {
      if (!access.profile.canApprovePayroll && access.profile.role !== "super_admin")
        throw new RequestError(
          "Recovery reopening requires Super Admin or authorised approval access",
          403
        );
      const employeeId = textValue(payload.employeeId, "Employee");
      await db.delete(recoveryFinalizations).where(
        and(
          eq(recoveryFinalizations.runId, runId),
          eq(recoveryFinalizations.employeeId, employeeId)
        )
      );
      await recalculateRun(db, runId, false);
      await writeAudit(
        db,
        "recovery_reopened",
        "employee",
        employeeId,
        "Reopened finalized employee deductions for correction",
        actorEmail
      );
    } else if (action === "save-accommodation") {
      const run = await requireRun(db, runId, true);
      const employeeId = textValue(payload.employeeId, "Employee");
      const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
      if (!employee || employee.clientUnitId !== run.clientUnitId)
        throw new RequestError("Employee not found in this unit", 404);
      const fields = typeof payload.fields === "object" && payload.fields !== null ? payload.fields : {};
      const numericFields = [
        "idCard",
        "rent",
        "bus",
        "medical",
        "ticket",
        "shoe",
        "advance",
        "food",
        "aadhaarUpdate",
        "bankAccountCharge",
        "tshirt",
        "oldPending",
        "gasShare",
        "rationShare",
        "provisionShare",
        "returnAmount"
      ];
      const values = {
        roomNumber: optionalValue(fields.roomNumber) ?? employee.roomNumber
      };
      for (const field of numericFields)
        values[field] = positiveValue(fields[field], field);
      const [existing] = await db.select().from(accommodationCharges).where(
        and(
          eq(accommodationCharges.runId, runId),
          eq(accommodationCharges.employeeId, employeeId)
        )
      ).limit(1);
      if (existing?.roomExpenseId) {
        values.gasShare = existing.gasShare;
        values.rationShare = existing.rationShare;
        values.provisionShare = existing.provisionShare;
      }
      if (existing)
        await db.update(accommodationCharges).set(values).where(eq(accommodationCharges.id, existing.id));
      else
        await db.insert(accommodationCharges).values({ runId, employeeId, ...values });
      await recalculateRun(db, runId, false);
      await writeAudit(
        db,
        "accommodation_updated",
        "employee",
        employeeId,
        `Updated accommodation recoveries for ${employee.employeeCode}`,
        actorEmail
      );
    } else if (action === "delete-accommodation") {
      await requireRun(db, runId, true);
      const employeeId = textValue(payload.employeeId, "Employee");
      const [existing] = await db.select().from(accommodationCharges).where(
        and(
          eq(accommodationCharges.runId, runId),
          eq(accommodationCharges.employeeId, employeeId)
        )
      ).limit(1);
      if (existing?.roomExpenseId)
        throw new RequestError(
          "Reopen the finalized room expense before deleting this employee's recovery",
          409
        );
      await db.delete(accommodationCharges).where(
        and(
          eq(accommodationCharges.runId, runId),
          eq(accommodationCharges.employeeId, employeeId)
        )
      );
      await db.update(payrollItems).set({ accommodationDeduction: 0, returnAmount: 0 }).where(
        and(
          eq(payrollItems.runId, runId),
          eq(payrollItems.employeeId, employeeId)
        )
      );
      await recalculateRun(db, runId, false);
      await writeAudit(
        db,
        "accommodation_deleted",
        "employee",
        employeeId,
        "Deleted accommodation recoveries",
        actorEmail
      );
    } else if (action === "prepare-payroll-batch" || action === "prepare-payroll-batches") {
      const run = await requireRun(db, runId);
      const rows = await db.select({
        employeeId: payrollItems.employeeId,
        accommodationType: employees.accommodationType,
        grossEarnings: payrollItems.grossEarnings,
        netPayable: payrollItems.netPayable
      }).from(payrollItems).innerJoin(employees, eq(payrollItems.employeeId, employees.id)).where(eq(payrollItems.runId, run.id));
      const types = action === "prepare-payroll-batch" ? [
        normalizeAccommodationType(
          textValue(payload.accommodationType, "Accommodation type")
        )
      ] : [...new Set(rows.map((row) => row.accommodationType))].sort();
      if (!types.length)
        throw new RequestError(
          "Add employees before preparing accommodation-wise payroll batches",
          409
        );
      let prepared = 0;
      for (const accommodationType of types) {
        const grouped = rows.filter(
          (row) => row.accommodationType === accommodationType
        );
        if (!grouped.length)
          throw new RequestError(
            `No payroll employees are assigned to ${accommodationType}`,
            409
          );
        const [existing] = await db.select().from(payrollBatches).where(
          and(
            eq(payrollBatches.runId, run.id),
            eq(payrollBatches.accommodationType, accommodationType)
          )
        ).limit(1);
        if (existing?.status === "cleared") {
          if (action === "prepare-payroll-batch")
            throw new RequestError(
              "This accommodation payroll batch has already been payment-cleared",
              409
            );
          continue;
        }
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const values = {
          employeeCount: grouped.length,
          grossEarnings: roundMoney(
            grouped.reduce((sum, row) => sum + row.grossEarnings, 0)
          ),
          netPayable: roundMoney(
            grouped.reduce((sum, row) => sum + row.netPayable, 0)
          ),
          status: "prepared",
          preparedBy: actorEmail,
          preparedAt: now,
          updatedAt: now
        };
        if (existing)
          await db.update(payrollBatches).set(values).where(eq(payrollBatches.id, existing.id));
        else
          await db.insert(payrollBatches).values({
            id: `BATCH-${crypto.randomUUID()}`,
            runId: run.id,
            accommodationType,
            ...values
          });
        prepared += 1;
      }
      await writeAudit(
        db,
        "payroll_batches_prepared",
        "payroll_run",
        run.id,
        `Prepared ${prepared} accommodation-wise payroll batch${prepared === 1 ? "" : "es"}`,
        actorEmail
      );
    } else if (action === "clear-payroll-batch" || action === "reopen-payroll-batch") {
      const run = await requireRun(db, runId);
      const batchId = textValue(payload.batchId, "Payroll batch");
      const [batch] = await db.select().from(payrollBatches).where(
        and(eq(payrollBatches.id, batchId), eq(payrollBatches.runId, run.id))
      ).limit(1);
      if (!batch)
        throw new RequestError("Accommodation payroll batch not found", 404);
      if (action === "clear-payroll-batch") {
        if (run.status !== "approved")
          throw new RequestError(
            "Approve the payroll run before clearing an accommodation payment batch",
            409
          );
        if (batch.status === "cleared")
          throw new RequestError(
            "This payment batch has already been cleared",
            409
          );
        if (!batch.employeeCount)
          throw new RequestError("This payment batch has no employees", 409);
        await db.update(payrollBatches).set({
          status: "cleared",
          paymentReference: optionalValue(payload.paymentReference),
          clearedBy: actorEmail,
          clearedAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }).where(eq(payrollBatches.id, batch.id));
        await writeAudit(
          db,
          "payroll_batch_cleared",
          "payroll_batch",
          batch.id,
          `Cleared ${batch.accommodationType} payment batch for ${batch.employeeCount} employees`,
          actorEmail
        );
      } else {
        if (batch.status !== "cleared")
          throw new RequestError(
            "Only a cleared payment batch can be reopened",
            409
          );
        await db.update(payrollBatches).set({
          status: "prepared",
          paymentReference: null,
          clearedBy: null,
          clearedAt: null,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }).where(eq(payrollBatches.id, batch.id));
        await writeAudit(
          db,
          "payroll_batch_reopened",
          "payroll_batch",
          batch.id,
          `Reopened ${batch.accommodationType} payment clearance`,
          actorEmail
        );
      }
    } else if (action === "save-hostel") {
      const vendorId = textValue(payload.vendorId, "Client");
      const id = optionalValue(payload.id) ?? `HOSTEL-${crypto.randomUUID()}`;
      const accommodationTypeId = textValue(
        payload.accommodationTypeId,
        "Accommodation type"
      );
      const [hostelType] = await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, accommodationTypeId)).limit(1);
      if (!hostelType || hostelType.vendorId !== vendorId)
        throw new RequestError(
          "Select an accommodation type from this client",
          409
        );
      const clientScope = Array.isArray(payload.clientScope) ? payload.clientScope.filter(
        (value) => typeof value === "string"
      ) : [];
      const validUnits = await db.select({ id: clientUnits.id }).from(clientUnits);
      const validIds = new Set(validUnits.map((unit) => unit.id));
      if (clientScope.some((unitId) => !validIds.has(unitId)))
        throw new RequestError(
          "Hostel client mapping contains an invalid client unit",
          409
        );
      const values = {
        vendorId,
        accommodationTypeId,
        name: textValue(payload.name, "Hostel name"),
        address: optionalValue(payload.address),
        inchargeName: optionalValue(payload.inchargeName),
        ebMeterNumber: optionalValue(payload.ebMeterNumber),
        clientScopeJson: JSON.stringify(clientScope),
        remarks: optionalValue(payload.remarks)
      };
      const [existing] = await db.select().from(hostels).where(eq(hostels.id, id)).limit(1);
      if (existing)
        await db.update(hostels).set(values).where(eq(hostels.id, id));
      else await db.insert(hostels).values({ id, ...values });
    } else if (action === "delete-hostel") {
      const id = textValue(payload.id, "Hostel");
      const [hostel] = await db.select().from(hostels).where(eq(hostels.id, id)).limit(1);
      if (!hostel) throw new RequestError("Hostel / local area not found", 404);
      const linkedRooms = await db.select({ id: accommodationRooms.id }).from(accommodationRooms).where(eq(accommodationRooms.hostelId, id));
      const history = await db.select({ id: hostelUtilityReadings.id }).from(hostelUtilityReadings).where(eq(hostelUtilityReadings.hostelId, id));
      if (linkedRooms.length || history.length)
        throw new RequestError(
          "Remove or remap all rooms and preserve/clear hostel history before deleting this record",
          409
        );
      await db.delete(hostels).where(eq(hostels.id, id));
      const allUsersWithHostel = await db.select().from(appUsers);
      for (const user2 of allUsersWithHostel) {
        const currentScope = normalizedScope(user2.hostelScopeJson);
        if (currentScope.includes(id)) {
          const updatedScope = currentScope.filter((item) => item !== id);
          await db.update(appUsers).set({
            hostelScopeJson: JSON.stringify(updatedScope),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          }).where(eq(appUsers.id, user2.id));
        }
      }
      await writeAudit(
        db,
        "hostel_deleted",
        "hostel",
        id,
        `Deleted unused hostel / local area ${hostel.name}`,
        actorEmail
      );
    } else if (action === "assign-room-hostel") {
      const roomId = textValue(payload.roomId, "Room");
      const hostelId = textValue(payload.hostelId, "Hostel");
      const [room] = await db.select().from(accommodationRooms).where(eq(accommodationRooms.id, roomId)).limit(1);
      const [hostel] = await db.select().from(hostels).where(eq(hostels.id, hostelId)).limit(1);
      const [roomType] = room ? await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, room.accommodationTypeId)).limit(1) : [];
      const [hostelType] = hostel?.accommodationTypeId ? await db.select().from(accommodationTypes).where(eq(accommodationTypes.id, hostel.accommodationTypeId)).limit(1) : [];
      const sharedJoyMapping = Boolean(
        roomType && hostelType && isJoySharedAccommodation(roomType.name) && isJoySharedAccommodation(hostelType.name)
      );
      if (!room || !hostel || (room.vendorId !== hostel.vendorId || room.accommodationTypeId !== hostel.accommodationTypeId) && !sharedJoyMapping)
        throw new RequestError(
          "Room and hostel must use the same accommodation type",
          409
        );
      await db.update(accommodationRooms).set({ hostelId }).where(eq(accommodationRooms.id, roomId));
    } else if (action === "save-hostel-utility") {
      const hostelId = textValue(payload.hostelId, "Hostel");
      const readingDate = dateValue(payload.readingDate, "Reading date");
      const utilityType = textValue(payload.utilityType, "Utility type");
      if (!["eb", "water", "payment", "housekeeping", "other"].includes(
        utilityType
      ))
        throw new RequestError("Unsupported hostel utility type");
      const readingValue = positiveValue(payload.readingValue ?? 0, "Reading");
      const [previous] = await db.select().from(hostelUtilityReadings).where(
        and(
          eq(hostelUtilityReadings.hostelId, hostelId),
          eq(hostelUtilityReadings.utilityType, utilityType),
          lt(hostelUtilityReadings.readingDate, readingDate)
        )
      ).orderBy(desc(hostelUtilityReadings.readingDate)).limit(1);
      if (previous && utilityType === "eb" && readingValue < previous.readingValue)
        throw new RequestError("Reading cannot be below the previous reading");
      await db.insert(hostelUtilityReadings).values({
        id: `HUTIL-${crypto.randomUUID()}`,
        hostelId,
        readingDate,
        utilityType,
        readingValue,
        consumption: previous && utilityType === "eb" ? roundMoney(readingValue - previous.readingValue) : 0,
        tankerQuantity: positiveValue(
          payload.tankerQuantity ?? 0,
          "Water quantity"
        ),
        amount: positiveValue(payload.amount ?? 0, "Paid amount"),
        activityName: optionalValue(payload.activityName),
        remarks: optionalValue(payload.remarks),
        enteredBy: actorEmail,
        status: "draft"
      });
    } else if (action === "approve-hostel-utility") {
      if (!access.profile.canApprovePayroll && access.profile.role !== "hr_team")
        throw new RequestError(
          "HR Manager or Super Admin approval is required",
          403
        );
      const id = textValue(payload.id, "Reading");
      await db.update(hostelUtilityReadings).set({
        status: "approved",
        approvedBy: actorEmail,
        approvedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq(hostelUtilityReadings.id, id));
    } else if (action === "save-vehicle") {
      const vendorId = textValue(payload.vendorId, "Joy company");
      const id = optionalValue(payload.id) ?? `VEH-${crypto.randomUUID()}`;
      const values = {
        vendorId,
        registrationNumber: textValue(
          payload.registrationNumber,
          "Registration number"
        ).toUpperCase(),
        vehicleName: textValue(payload.vehicleName, "Vehicle name"),
        vehicleType: optionalValue(payload.vehicleType) ?? "car",
        currentOdometer: positiveValue(
          payload.currentOdometer ?? 0,
          "Current odometer"
        ),
        permitExpiry: optionalValue(payload.permitExpiry),
        insuranceExpiry: optionalValue(payload.insuranceExpiry),
        fcExpiry: optionalValue(payload.fcExpiry),
        pollutionExpiry: optionalValue(payload.pollutionExpiry),
        nextServiceDate: optionalValue(payload.nextServiceDate),
        nextServiceKm: payload.nextServiceKm ? positiveValue(payload.nextServiceKm, "Next service km") : null,
        tyreChangedDate: optionalValue(payload.tyreChangedDate),
        tyreChangedKm: payload.tyreChangedKm ? positiveValue(payload.tyreChangedKm, "Tyre changed km") : null,
        lastWaterWashDate: optionalValue(payload.lastWaterWashDate),
        lastWheelAlignmentDate: optionalValue(payload.lastWheelAlignmentDate),
        remarks: optionalValue(payload.remarks)
      };
      const [existing] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
      if (existing)
        await db.update(vehicles).set(values).where(eq(vehicles.id, id));
      else await db.insert(vehicles).values({ id, ...values });
      await writeAudit(
        db,
        existing ? "vehicle_updated" : "vehicle_created",
        "vehicle",
        id,
        `${existing ? "Updated" : "Added"} vehicle ${values.registrationNumber}`,
        actorEmail
      );
    } else if (action === "save-vehicle-record") {
      const vehicleId = textValue(payload.vehicleId, "Vehicle");
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
      if (!vehicle) throw new RequestError("Vehicle not found", 404);
      const id = optionalValue(payload.id) ?? `VREC-${crypto.randomUUID()}`;
      const startKm = payload.startKm ? positiveValue(payload.startKm, "Start km") : null;
      const endKm = payload.endKm ? positiveValue(payload.endKm, "End km") : null;
      if (startKm !== null && endKm !== null && endKm < startKm)
        throw new RequestError("End km cannot be below start km");
      const values = {
        vehicleId,
        recordDate: dateValue(payload.recordDate, "Record date"),
        recordType: textValue(payload.recordType, "Record type"),
        tripFrom: optionalValue(payload.tripFrom),
        tripTo: optionalValue(payload.tripTo),
        purpose: optionalValue(payload.purpose),
        startKm,
        endKm,
        litres: positiveValue(payload.litres ?? 0, "Litres"),
        amount: positiveValue(payload.amount ?? 0, "Amount"),
        vendorName: optionalValue(payload.vendorName),
        nextDueDate: optionalValue(payload.nextDueDate),
        nextDueKm: payload.nextDueKm ? positiveValue(payload.nextDueKm, "Next due km") : null,
        remarks: optionalValue(payload.remarks),
        enteredBy: actorEmail,
        status: "draft"
      };
      await db.insert(vehicleRecords).values({ id, ...values });
      if (endKm !== null && endKm > vehicle.currentOdometer)
        await db.update(vehicles).set({ currentOdometer: endKm }).where(eq(vehicles.id, vehicleId));
      await writeAudit(
        db,
        "vehicle_record_created",
        "vehicle_record",
        id,
        `Added ${values.recordType} record for ${vehicle.registrationNumber}`,
        actorEmail
      );
    } else if (action === "save-utility-meter") {
      const vendorId = textValue(payload.vendorId, "Joy company");
      const id = optionalValue(payload.id) ?? `METER-${crypto.randomUUID()}`;
      const values = {
        vendorId,
        locationType: payload.locationType === "office" ? "office" : "hostel",
        locationName: textValue(payload.locationName, "Location name"),
        meterNumber: optionalValue(payload.meterNumber),
        remarks: optionalValue(payload.remarks)
      };
      const [existing] = await db.select().from(utilityMeters).where(eq(utilityMeters.id, id)).limit(1);
      if (existing)
        await db.update(utilityMeters).set(values).where(eq(utilityMeters.id, id));
      else await db.insert(utilityMeters).values({ id, ...values });
    } else if (action === "save-eb-reading") {
      const meterId = textValue(payload.meterId, "EB meter");
      const [meter] = await db.select().from(utilityMeters).where(eq(utilityMeters.id, meterId)).limit(1);
      if (!meter) throw new RequestError("EB meter not found", 404);
      const readingDate = dateValue(payload.readingDate, "Reading date");
      const readingValue = positiveValue(payload.readingValue, "Meter reading");
      const [previous] = await db.select().from(ebReadings).where(
        and(
          eq(ebReadings.meterId, meterId),
          lt(ebReadings.readingDate, readingDate)
        )
      ).orderBy(desc(ebReadings.readingDate)).limit(1);
      if (previous && readingValue < previous.readingValue)
        throw new RequestError("Reading cannot be below the previous reading");
      await db.insert(ebReadings).values({
        id: `EB-${crypto.randomUUID()}`,
        meterId,
        readingDate,
        readingValue,
        unitsConsumed: previous ? roundMoney(readingValue - previous.readingValue) : 0,
        amount: positiveValue(payload.amount ?? 0, "EB amount"),
        remarks: optionalValue(payload.remarks),
        enteredBy: actorEmail,
        status: "draft"
      });
    } else if (action === "approve-operation-record") {
      if (!access.profile.canApprovePayroll && access.profile.role !== "hr_team")
        throw new RequestError(
          "HR Manager or Super Admin approval is required",
          403
        );
      const recordType = textValue(payload.recordType, "Record type");
      const id = textValue(payload.id, "Record");
      const approval = {
        status: "approved",
        approvedBy: actorEmail,
        approvedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (recordType === "vehicle")
        await db.update(vehicleRecords).set(approval).where(eq(vehicleRecords.id, id));
      else if (recordType === "eb")
        await db.update(ebReadings).set(approval).where(eq(ebReadings.id, id));
      else throw new RequestError("Unsupported approval record");
    } else if (action === "save-rules") {
      const vendorId = textValue(payload.vendorId, "Payroll entity");
      const fields = typeof payload.rules === "object" && payload.rules !== null ? payload.rules : {};
      const standardWorkingDays = positiveValue(
        fields.standardWorkingDays,
        "Working days",
        31
      );
      if (standardWorkingDays < 1 || !Number.isInteger(standardWorkingDays))
        throw new RequestError(
          "Working days must be a whole number between 1 and 31"
        );
      const effectiveFrom = textValue(fields.effectiveFrom, "Effective date");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom))
        throw new RequestError("Effective date must be YYYY-MM-DD");
      const values = {
        standardWorkingDays,
        pfRate: positiveValue(fields.pfRate, "PF rate", 100),
        esiRate: positiveValue(fields.esiRate, "ESI rate", 100),
        professionalTax: positiveValue(
          fields.professionalTax,
          "Professional tax"
        ),
        lwf: positiveValue(fields.lwf, "LWF"),
        overtimeHourlyRate: positiveValue(
          fields.overtimeHourlyRate,
          "Overtime rate"
        ),
        paidLeave: fields.paidLeave ? 1 : 0,
        paidWeekOff: fields.paidWeekOff ? 1 : 0,
        effectiveFrom,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const [existing] = await db.select().from(payrollRules).where(eq(payrollRules.vendorId, vendorId)).limit(1);
      if (existing)
        await db.update(payrollRules).set(values).where(eq(payrollRules.id, existing.id));
      else
        await db.insert(payrollRules).values({ id: `RULE-${crypto.randomUUID()}`, vendorId, ...values });
      await writeAudit(
        db,
        "rules_updated",
        "client",
        vendorId,
        "Updated client salary, statutory, overtime and attendance rules",
        actorEmail
      );
    } else if (action === "import-workbook") {
      runId = await importWorkbook(db, payload, actorEmail);
    } else if (action === "lock-payment-batch") {
      const run = await requireRun(db, runId);
      if (run.status !== "approved")
        throw new RequestError(
          "Approve the payroll run before locking a bank upload batch",
          409
        );
      const itemIds = requiredStringArray(payload.itemIds, "employee batch");
      const selectedRows = await db.select({
        id: payrollItems.id,
        employeeId: payrollItems.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: employees.name,
        paymentMode: employees.paymentMode,
        bankAccountMasked: employees.bankAccountMasked,
        ifscMasked: employees.ifscMasked,
        netPayable: payrollItems.netPayable
      }).from(payrollItems).innerJoin(employees, eq(payrollItems.employeeId, employees.id)).where(
        and(
          eq(payrollItems.runId, run.id),
          inArray(payrollItems.id, itemIds)
        )
      );
      if (selectedRows.length !== itemIds.length)
        throw new RequestError(
          "One or more selected employees do not belong to this payroll run",
          409
        );
      const invalidRows = selectedRows.filter(
        (row) => row.paymentMode !== "bank" || !row.bankAccountMasked || !row.ifscMasked || !Number.isFinite(row.netPayable) || row.netPayable < 0
      );
      if (invalidRows.length)
        throw new RequestError(
          `Complete bank account number and IFSC before locking: ${invalidRows.map((row) => row.employeeCode).join(", ")}`,
          409
        );
      const existingRows = await db.select({
        payrollItemId: paymentExportBatchItems.payrollItemId,
        batchId: paymentExportBatchItems.batchId,
        status: paymentExportBatches.status
      }).from(paymentExportBatchItems).innerJoin(
        paymentExportBatches,
        eq(paymentExportBatchItems.batchId, paymentExportBatches.id)
      ).where(
        and(
          eq(paymentExportBatchItems.runId, run.id),
          inArray(paymentExportBatchItems.payrollItemId, itemIds)
        )
      );
      if (existingRows.length) {
        const existingCodes = selectedRows.filter(
          (row) => existingRows.some((entry) => entry.payrollItemId === row.id)
        ).map((row) => row.employeeCode).join(", ");
        const downloaded = existingRows.some(
          (entry) => entry.status === "downloaded"
        );
        throw new RequestError(
          downloaded ? `A bank file was already downloaded for: ${existingCodes}` : `These employees are already locked in another bank batch: ${existingCodes}`,
          409
        );
      }
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const batchId = `PAYMENT-${crypto.randomUUID()}`;
      await db.insert(paymentExportBatches).values({
        id: batchId,
        runId: run.id,
        status: "locked",
        exportFormat: null,
        employeeCount: selectedRows.length,
        totalPayable: roundMoney(
          selectedRows.reduce((sum, row) => sum + row.netPayable, 0)
        ),
        lockedBy: actorEmail,
        lockedAt: now,
        createdAt: now,
        updatedAt: now
      });
      await db.insert(paymentExportBatchItems).values(
        selectedRows.map((row) => ({
          id: `PAYMENT-ITEM-${crypto.randomUUID()}`,
          batchId,
          runId: run.id,
          payrollItemId: row.id,
          employeeId: row.employeeId,
          amount: row.netPayable,
          createdAt: now
        }))
      );
      await writeAudit(
        db,
        "payment_batch_locked",
        "payment_export_batch",
        batchId,
        `Locked ${selectedRows.length} individual employee payment${selectedRows.length === 1 ? "" : "s"} for one bank upload batch (${roundMoney(selectedRows.reduce((sum, row) => sum + row.netPayable, 0))})`,
        actorEmail
      );
    } else if (action === "unlock-payment-batch") {
      const run = await requireRun(db, runId);
      if (run.status !== "approved")
        throw new RequestError(
          "Approve the payroll run before changing a bank upload batch",
          409
        );
      const batchId = textValue(payload.batchId, "Payment batch");
      const [batch] = await db.select().from(paymentExportBatches).where(
        and(
          eq(paymentExportBatches.id, batchId),
          eq(paymentExportBatches.runId, run.id)
        )
      ).limit(1);
      if (!batch) throw new RequestError("Payment batch not found", 404);
      if (batch.status === "downloaded")
        throw new RequestError(
          "This bank file was already downloaded and cannot be unlocked; create a new payroll run for a corrected payment",
          409
        );
      await db.delete(paymentExportBatchItems).where(eq(paymentExportBatchItems.batchId, batch.id));
      await db.delete(paymentExportBatches).where(eq(paymentExportBatches.id, batch.id));
      await writeAudit(
        db,
        "payment_batch_unlocked",
        "payment_export_batch",
        batch.id,
        "Unlocked the individual employee bank batch before download",
        actorEmail
      );
    } else if (action === "download-payment-batch") {
      const run = await requireRun(db, runId);
      if (run.status !== "approved")
        throw new RequestError(
          "Approve the payroll run before downloading a bank upload batch",
          409
        );
      const exportFormat = textValue(payload.exportFormat, "Payment export format");
      const allowedFormats = /* @__PURE__ */ new Set([
        "bank_csv",
        "indian_bank_xlsx",
        "cub_any_bank_txt",
        "cub_to_cub_txt",
        "cash_excel",
        "cash_csv"
      ]);
      if (!allowedFormats.has(exportFormat))
        throw new RequestError("Unsupported payment export format");
      const requestedItemIds = Array.isArray(payload.itemIds) ? requiredStringArray(payload.itemIds, "employee batch") : [];
      let batchId = optionalValue(payload.batchId);
      if (requestedItemIds.length) {
        const selectedRows = await db.select({
          id: payrollItems.id,
          employeeId: payrollItems.employeeId,
          employeeCode: employees.employeeCode,
          paymentMode: employees.paymentMode,
          bankAccountMasked: employees.bankAccountMasked,
          ifscMasked: employees.ifscMasked,
          netPayable: payrollItems.netPayable
        }).from(payrollItems).innerJoin(employees, eq(payrollItems.employeeId, employees.id)).where(
          and(
            eq(payrollItems.runId, run.id),
            inArray(payrollItems.id, requestedItemIds)
          )
        );
        if (selectedRows.length !== requestedItemIds.length)
          throw new RequestError(
            "One or more selected employees do not belong to this payroll run",
            409
          );
        const isCashFormat = exportFormat === "cash_excel" || exportFormat === "cash_csv";
        const invalidRows = selectedRows.filter(
          (row) => !isCashFormat && (row.paymentMode !== "bank" || !row.bankAccountMasked || !row.ifscMasked) || !Number.isFinite(row.netPayable) || row.netPayable < 0
        );
        if (invalidRows.length)
          throw new RequestError(
            isCashFormat ? `Selected employee(s) have invalid payable amounts: ${invalidRows.map((row) => row.employeeCode).join(", ")}` : `Complete bank account number and IFSC before downloading: ${invalidRows.map((row) => row.employeeCode).join(", ")}`,
            409
          );
        const existingRows = await db.select({
          payrollItemId: paymentExportBatchItems.payrollItemId,
          status: paymentExportBatches.status
        }).from(paymentExportBatchItems).innerJoin(
          paymentExportBatches,
          eq(paymentExportBatchItems.batchId, paymentExportBatches.id)
        ).where(
          and(
            eq(paymentExportBatchItems.runId, run.id),
            inArray(
              paymentExportBatchItems.payrollItemId,
              requestedItemIds
            )
          )
        );
        if (existingRows.length) {
          const existingCodes = selectedRows.filter(
            (row) => existingRows.some((entry) => entry.payrollItemId === row.id)
          ).map((row) => row.employeeCode).join(", ");
          throw new RequestError(
            `A bank file was already prepared or downloaded for: ${existingCodes}`,
            409
          );
        }
        const now2 = (/* @__PURE__ */ new Date()).toISOString();
        batchId = `PAYMENT-${crypto.randomUUID()}`;
        await db.insert(paymentExportBatches).values({
          id: batchId,
          runId: run.id,
          status: "locked",
          exportFormat: null,
          employeeCount: selectedRows.length,
          totalPayable: roundMoney(
            selectedRows.reduce((sum, row) => sum + row.netPayable, 0)
          ),
          lockedBy: actorEmail,
          lockedAt: now2,
          createdAt: now2,
          updatedAt: now2
        });
        try {
          await db.insert(paymentExportBatchItems).values(
            selectedRows.map((row) => ({
              id: `PAYMENT-ITEM-${crypto.randomUUID()}`,
              batchId,
              runId: run.id,
              payrollItemId: row.id,
              employeeId: row.employeeId,
              amount: row.netPayable,
              createdAt: now2
            }))
          );
        } catch {
          await db.delete(paymentExportBatches).where(eq(paymentExportBatches.id, batchId));
          throw new RequestError(
            "Another session already prepared one of these employees; duplicate bank processing was blocked",
            409
          );
        }
      }
      if (!batchId) throw new RequestError("Payment batch is required");
      const [batch] = await db.select().from(paymentExportBatches).where(
        and(
          eq(paymentExportBatches.id, batchId),
          eq(paymentExportBatches.runId, run.id)
        )
      ).limit(1);
      if (!batch) throw new RequestError("Payment batch not found", 404);
      if (batch.status === "downloaded")
        throw new RequestError(
          "This bank upload batch was already downloaded and is protected from duplicate processing",
          409
        );
      const batchItems = await db.select({ id: paymentExportBatchItems.id }).from(paymentExportBatchItems).where(eq(paymentExportBatchItems.batchId, batch.id));
      if (batchItems.length !== batch.employeeCount)
        throw new RequestError(
          "The locked employee selection changed; unlock and create the batch again",
          409
        );
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const downloadResult = await db.update(paymentExportBatches).set({
        status: "downloaded",
        exportFormat,
        downloadedBy: actorEmail,
        downloadedAt: now,
        updatedAt: now
      }).where(
        and(
          eq(paymentExportBatches.id, batch.id),
          eq(paymentExportBatches.status, "locked")
        )
      );
      const changedRows = mutationChangedRows(downloadResult);
      if (changedRows !== null && changedRows < 1)
        throw new RequestError(
          "This bank upload batch was already downloaded by another session; duplicate processing was blocked",
          409
        );
      await writeAudit(
        db,
        "payment_batch_downloaded",
        "payment_export_batch",
        batch.id,
        `Downloaded ${exportFormat} for ${batch.employeeCount} individually selected employee${batch.employeeCount === 1 ? "" : "s"}; the one-click reservation blocked duplicate processing`,
        actorEmail
      );
    } else if (action === "resolve-issues" || action === "recalculate") {
      await requireRun(db, runId, true);
      await recalculateRun(db, runId, action === "recalculate");
      await writeAudit(
        db,
        action === "recalculate" ? "recalculated" : "validation_checked",
        "payroll_run",
        runId,
        action === "recalculate" ? "Recalculated attendance, earnings, deductions and net pay" : "Rechecked employee payroll and bank readiness",
        actorEmail
      );
    } else if (action === "approve") {
      await requireRun(db, runId, true);
      await recalculateRun(db, runId, false);
      const run = await requireRun(db, runId, true);
      const approvalItems = await db.select({
        id: payrollItems.id,
        employeeId: payrollItems.employeeId,
        validationStatus: payrollItems.validationStatus,
        netPayable: payrollItems.netPayable
      }).from(payrollItems).where(eq(payrollItems.runId, runId));
      if (!run.employeeCount || !approvalItems.length)
        throw new RequestError("Add employees before approving payroll", 409);
      const reviewItems = approvalItems.filter(
        (item) => item.validationStatus !== "ready"
      );
      if (run.issueCount > 0 || reviewItems.length)
        throw new RequestError(
          "Payroll approval blocked: " + Math.max(run.issueCount, reviewItems.length) + " employee record(s) still require review. Recheck employee, statutory and salary readiness first.",
          409
        );
      if (run.grossEarnings <= 0)
        throw new RequestError(
          "Add attendance or salary amounts before approving payroll",
          409
        );
      if (run.netPayable < 0)
        throw new RequestError("Payroll net payable cannot be negative", 409);
      if (Math.abs(run.netPayable - (run.bankPayable + run.cashPayable)) > 0.01)
        throw new RequestError(
          "Payroll approval blocked: bank payable and cash payable (\u20B9" + (run.bankPayable + run.cashPayable).toFixed(2) + ") does not match final net payable (\u20B9" + run.netPayable.toFixed(2) + "). Recalculate before approval.",
          409
        );
      const invalidPayables = approvalItems.filter(
        (item) => !Number.isFinite(item.netPayable) || item.netPayable < 0
      );
      if (invalidPayables.length)
        throw new RequestError(
          "Payroll approval blocked: " + invalidPayables.length + " employee(s) have invalid final payable values.",
          409
        );
      await db.update(payrollRuns).set({
        status: "approved",
        approvedBy: user?.displayName ?? "Payroll approver",
        approvedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq(payrollRuns.id, runId));
      const subsequentDraftRuns = await db.select().from(payrollRuns).where(
        and(
          eq(payrollRuns.clientUnitId, run.clientUnitId),
          gt(payrollRuns.payPeriod, run.payPeriod),
          eq(payrollRuns.status, "draft")
        )
      );
      for (const nextDraftRun of subsequentDraftRuns) {
        await syncPendingNegativeCarryovers(db, nextDraftRun);
      }
      await writeAudit(
        db,
        "approved",
        "payroll_run",
        runId,
        "Approved payroll and unlocked payment exports",
        actorEmail
      );
    } else if (action === "reopen-payroll-for-recovery") {
      const run = await requireRun(db, runId);
      if (run.status !== "approved")
        throw new RequestError(
          "Only an approved payroll can be reopened for recovery correction",
          409
        );
      const clearedBatches = await db.select({ id: payrollBatches.id }).from(payrollBatches).where(
        and(
          eq(payrollBatches.runId, runId),
          eq(payrollBatches.status, "cleared")
        )
      );
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const paymentBatches = await db.select().from(paymentExportBatches).where(eq(paymentExportBatches.runId, runId));
      const downloadedPaymentBatches = paymentBatches.filter(
        (batch) => batch.status === "downloaded"
      );
      if (downloadedPaymentBatches.length)
        throw new RequestError(
          "This payroll already has a downloaded bank file. Duplicate-safe recovery changes require a new payroll run or an authorised payment reversal first",
          409
        );
      const lockedPaymentBatches = paymentBatches.filter(
        (batch) => batch.status === "locked"
      );
      if (lockedPaymentBatches.length) {
        await db.delete(paymentExportBatchItems).where(eq(paymentExportBatchItems.runId, runId));
        await db.delete(paymentExportBatches).where(eq(paymentExportBatches.runId, runId));
      }
      if (clearedBatches.length)
        await db.update(payrollBatches).set({
          status: "prepared",
          paymentReference: null,
          clearedBy: null,
          clearedAt: null,
          updatedAt: now
        }).where(
          and(
            eq(payrollBatches.runId, runId),
            eq(payrollBatches.status, "cleared")
          )
        );
      await db.update(payrollRuns).set({
        status: "draft",
        approvedBy: null,
        approvedAt: null,
        updatedAt: now
      }).where(eq(payrollRuns.id, runId));
      await recalculateRun(db, runId, false);
      await writeAudit(
        db,
        "payroll_reopened_for_recovery",
        "payroll_run",
        runId,
        `Reopened ${clearedBatches.length} cleared accommodation payment batch(es), removed ${lockedPaymentBatches.length ? "the locked bank batch" : "no locked bank batch"}, and reopened payroll for recovery correction`,
        actorEmail
      );
    } else if (action === "reopen" || action === "reset-demo") {
      const run = await requireRun(db, runId);
      if (run.status !== "approved")
        throw new RequestError("Only an approved payroll can be reopened", 409);
      const activeEmployees = await db.select().from(employees).where(
        and(
          eq(employees.clientUnitId, run.clientUnitId),
          or(
            eq(employees.status, "active"),
            and(
              gte(employees.finalPayrollMonth, run.payPeriod),
              lte(sql`coalesce(substr(${employees.dateOfLeaving}, 1, 7), ${employees.finalPayrollMonth})`, run.payPeriod)
            ),
            eq(employees.finalPayrollMonth, run.payPeriod)
          )
        )
      );
      const existingItems = await db.select({ employeeId: payrollItems.employeeId }).from(payrollItems).where(eq(payrollItems.runId, runId));
      const existingEmployeeIds = new Set(
        existingItems.map((item) => item.employeeId)
      );
      const missingEmployees = activeEmployees.filter(
        (employee) => !existingEmployeeIds.has(employee.id)
      );
      const clearedBatches = await db.select({ id: payrollBatches.id }).from(payrollBatches).where(
        and(
          eq(payrollBatches.runId, runId),
          eq(payrollBatches.status, "cleared")
        )
      );
      const paymentBatches = await db.select().from(paymentExportBatches).where(eq(paymentExportBatches.runId, runId));
      const downloadedPaymentBatches = paymentBatches.filter(
        (batch) => batch.status === "downloaded"
      );
      if (downloadedPaymentBatches.length && !missingEmployees.length)
        throw new RequestError(
          "This payroll already has a downloaded bank file. Duplicate-safe corrections require a new payroll run or an authorised payment reversal first",
          409
        );
      if ((downloadedPaymentBatches.length || clearedBatches.length) && !access.profile.canApprovePayroll)
        throw new RequestError(
          "Only a Super Admin or authorised payroll approver can reopen a payment-protected payroll",
          403
        );
      const lockedPaymentBatches = paymentBatches.filter(
        (batch) => batch.status === "locked"
      );
      if (lockedPaymentBatches.length) {
        await db.delete(paymentExportBatchItems).where(
          inArray(
            paymentExportBatchItems.batchId,
            lockedPaymentBatches.map((batch) => batch.id)
          )
        );
        await db.delete(paymentExportBatches).where(
          inArray(
            paymentExportBatches.id,
            lockedPaymentBatches.map((batch) => batch.id)
          )
        );
      }
      const reopeningClearedBatches = !downloadedPaymentBatches.length && clearedBatches.length > 0;
      if (reopeningClearedBatches) {
        requireModule(access, "payments", "manage");
        await db.update(payrollBatches).set({
          status: "prepared",
          paymentReference: null,
          clearedBy: null,
          clearedAt: null,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }).where(
          and(
            eq(payrollBatches.runId, runId),
            eq(payrollBatches.status, "cleared")
          )
        );
      }
      const addedEmployeeCount = await addEmployeesToRun(
        db,
        run,
        missingEmployees
      );
      await db.update(payrollRuns).set({
        status: "draft",
        approvedBy: null,
        approvedAt: null,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq(payrollRuns.id, runId));
      await recalculateRun(db, runId, false);
      await writeAudit(
        db,
        "reopened",
        "payroll_run",
        runId,
        downloadedPaymentBatches.length ? `Reopened payroll in supplementary mode and added ${addedEmployeeCount} missed employee(s); ${downloadedPaymentBatches.length} downloaded bank batch(es) and paid employee records remain locked` : `Reopened payroll for corrections, added ${addedEmployeeCount} missed employee(s), reopened ${clearedBatches.length} cleared accommodation batch(es), and removed ${lockedPaymentBatches.length} undownloaded bank batch(es)`,
        actorEmail
      );
    } else if (action === "delete-payroll-run") {
      const run = await requireRun(db, runId, true);
      await db.delete(paymentExportBatchItems).where(eq(paymentExportBatchItems.runId, runId));
      await db.delete(paymentExportBatches).where(eq(paymentExportBatches.runId, runId));
      await db.delete(payrollBatches).where(eq(payrollBatches.runId, runId));
      await db.delete(recoveryEntries).where(eq(recoveryEntries.runId, runId));
      await db.delete(accommodationCharges).where(eq(accommodationCharges.runId, runId));
      await db.delete(payrollItems).where(eq(payrollItems.runId, runId));
      await db.delete(payrollRuns).where(eq(payrollRuns.id, runId));
      await writeAudit(
        db,
        "run_deleted",
        "payroll_run",
        runId,
        `Deleted ${run.payPeriod} payroll calculations; attendance records were preserved`,
        actorEmail
      );
    } else if (action === "create-staff-task") {
      const taskId = `TASK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const title = textValue(payload.title, "Task Title");
      const description = optionalValue(payload.description) || null;
      const assignedToUserId = optionalValue(payload.assignedToUserId) || null;
      const assignedToName = textValue(payload.assignedToName, "Staff Name");
      const assignedToPhone = textValue(payload.assignedToPhone, "Staff Phone Number");
      const priority = optionalValue(payload.priority) || "normal";
      const dueDate = optionalValue(payload.dueDate) || null;
      const shouldSendWhatsApp = payload.sendWhatsApp !== false;
      const createdBy = access.identity.email;
      let whatsappStatus = "skipped";
      let whatsappMessageId = null;
      if (shouldSendWhatsApp) {
        try {
          const waRes = await sendTaskAssignmentWhatsApp({
            id: taskId,
            title,
            description,
            assignedToName,
            assignedToPhone,
            priority,
            dueDate,
            createdBy
          });
          if (waRes.success && waRes.messageId) {
            whatsappStatus = "sent";
            whatsappMessageId = waRes.messageId;
          } else {
            whatsappStatus = `failed: ${waRes.error || "delivery error"}`;
          }
        } catch (err) {
          whatsappStatus = `error: ${err.message}`;
        }
      }
      await db.insert(staffTasks).values({
        id: taskId,
        title,
        description,
        assignedToUserId,
        assignedToName,
        assignedToPhone,
        priority,
        dueDate,
        status: "pending",
        autoRemind: payload.autoRemind === false ? 0 : 1,
        reminderCount: 0,
        acceptedAt: null,
        lastReminderAt: null,
        whatsappMessageId,
        whatsappStatus,
        createdBy,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await writeAudit(
        db,
        "task_created",
        "staff_task",
        taskId,
        `Assigned task "${title}" to ${assignedToName} (${assignedToPhone}) with priority ${priority}${whatsappStatus === "sent" ? " [WhatsApp delivered with action buttons]" : ""}`,
        createdBy
      );
    } else if (action === "update-staff-task") {
      const taskId = textValue(payload.id, "Task ID");
      const status = textValue(payload.status, "Status");
      const completionNotes = optionalValue(payload.completionNotes) || null;
      const [existingTask] = await db.select().from(staffTasks).where(eq(staffTasks.id, taskId)).limit(1);
      if (!existingTask) throw new RequestError("Task not found", 404);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const isAccepted = status === "in_progress";
      const isCompleted = status === "completed";
      const acceptedAt = isAccepted ? existingTask.acceptedAt || now : existingTask.acceptedAt;
      const completedAt = isCompleted ? existingTask.completedAt || now : null;
      await db.update(staffTasks).set({
        status,
        completionNotes: completionNotes ?? existingTask.completionNotes,
        acceptedAt,
        completedAt,
        updatedAt: now
      }).where(eq(staffTasks.id, taskId));
      if (isAccepted && existingTask.status !== "in_progress") {
        try {
          const [superAdminUser] = await db.select().from(appUsers).where(eq(appUsers.role, "super_admin")).limit(1);
          const adminPhone = superAdminUser?.mobileNumber || "919944399088";
          await sendTaskAcceptedAlertWhatsApp(adminPhone, {
            title: existingTask.title,
            assignedToName: existingTask.assignedToName,
            acceptedAt: (/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          });
        } catch (waErr) {
          console.error("Failed to notify super admin via WhatsApp:", waErr);
        }
      }
      if (isCompleted && existingTask.status !== "completed") {
        try {
          const [superAdminUser] = await db.select().from(appUsers).where(eq(appUsers.role, "super_admin")).limit(1);
          const adminPhone = superAdminUser?.mobileNumber || "919944399088";
          await sendTaskCompletedAlertWhatsApp(adminPhone, {
            title: existingTask.title,
            assignedToName: existingTask.assignedToName,
            completedAt: (/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            completionNotes
          });
        } catch (waErr) {
          console.error("Failed to notify super admin via WhatsApp:", waErr);
        }
      }
      await writeAudit(
        db,
        "task_updated",
        "staff_task",
        taskId,
        `Updated task "${existingTask.title}" status to ${status}${isCompleted ? " (Super Admin notified of completion)" : isAccepted ? " (Super Admin notified of acceptance)" : ""}`,
        access.identity.email
      );
    } else if (action === "delete-staff-task") {
      const taskId = textValue(payload.id, "Task ID");
      const [existingTask] = await db.select().from(staffTasks).where(eq(staffTasks.id, taskId)).limit(1);
      if (existingTask) {
        await db.delete(staffTasks).where(eq(staffTasks.id, taskId));
        await writeAudit(
          db,
          "task_deleted",
          "staff_task",
          taskId,
          `Deleted task "${existingTask.title}"`,
          access.identity.email
        );
      }
    } else if (action === "send-task-whatsapp-reminder") {
      const taskId = textValue(payload.id, "Task ID");
      const [task] = await db.select().from(staffTasks).where(eq(staffTasks.id, taskId)).limit(1);
      if (!task) throw new RequestError("Task not found", 404);
      const reminderNum = (task.reminderCount || 0) + 1;
      const waRes = await sendTaskAssignmentWhatsApp({
        id: task.id,
        title: task.title,
        description: task.description,
        assignedToName: task.assignedToName,
        assignedToPhone: task.assignedToPhone,
        priority: task.priority,
        dueDate: task.dueDate,
        createdBy: access.identity.email,
        isReminder: true,
        reminderNumber: reminderNum
      });
      const whatsappStatus = waRes.success ? `sent (reminder #${reminderNum})` : `failed: ${waRes.error || "delivery error"}`;
      await db.update(staffTasks).set({
        whatsappStatus,
        whatsappMessageId: waRes.messageId ?? task.whatsappMessageId,
        lastReminderAt: (/* @__PURE__ */ new Date()).toISOString(),
        reminderCount: reminderNum,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }).where(eq(staffTasks.id, taskId));
      if (!waRes.success) {
        throw new RequestError(`WhatsApp delivery failed: ${waRes.error || "Unknown error"}`);
      }
    } else if (action === "trigger-due-task-reminders") {
      const db2 = getDb();
      const activeTasks = await db2.select().from(staffTasks).where(
        and(
          inArray(staffTasks.status, ["pending", "in_progress"]),
          eq(staffTasks.autoRemind, 1)
        )
      );
      const twoHoursInMs = 2 * 60 * 60 * 1e3;
      const nowTime = Date.now();
      const forceAll = payload.force === true;
      let sentCount = 0;
      for (const task of activeTasks) {
        const lastSent = task.lastReminderAt || task.createdAt;
        const timeSince = nowTime - new Date(lastSent).getTime();
        if (forceAll || timeSince >= twoHoursInMs) {
          const reminderNum = (task.reminderCount || 0) + 1;
          const waRes = await sendTaskAssignmentWhatsApp({
            id: task.id,
            title: task.title,
            description: task.description,
            assignedToName: task.assignedToName,
            assignedToPhone: task.assignedToPhone,
            priority: task.priority,
            dueDate: task.dueDate,
            createdBy: task.createdBy,
            isReminder: true,
            reminderNumber: reminderNum
          });
          if (waRes.success) {
            sentCount++;
            await db2.update(staffTasks).set({
              lastReminderAt: (/* @__PURE__ */ new Date()).toISOString(),
              reminderCount: reminderNum,
              whatsappStatus: `sent (reminder #${reminderNum})`,
              whatsappMessageId: waRes.messageId ?? task.whatsappMessageId,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
            }).where(eq(staffTasks.id, task.id));
          }
        }
      }
      await writeAudit(
        db2,
        "task_reminders_triggered",
        "staff_task",
        "AUTO-REMINDERS",
        `Checked ${activeTasks.length} active task(s); dispatched ${sentCount} interval reminder(s)`,
        access.identity.email
      );
    } else {
      throw new RequestError(`Unsupported action: ${action}`);
    }
    return Response.json({
      ...await loadAppData(access),
      selectedRunId: runId
    });
  } catch (error) {
    const messages = errorMessages(error);
    const combined = messages.join(" ");
    if (/UNIQUE constraint failed: vendors\.code|vendors_code_(?:unique|key)/i.test(combined))
      return Response.json(
        { error: "This client code already exists" },
        { status: 409 }
      );
    if (/UNIQUE constraint failed: shift_definitions\.vendor_id, shift_definitions\.name|shift_client_name_unique/i.test(
      combined
    ))
      return Response.json(
        { error: "This shift name already exists for the selected client" },
        { status: 409 }
      );
    if (/UNIQUE constraint failed: employees\.employee_code|employees_employee_code_(?:unique|key)/i.test(combined))
      return Response.json(
        { error: "This employee code already exists" },
        { status: 409 }
      );
    if (/payment_export_batch_run_item_unique|payment_export_batch_items_run_id_payroll_item_id/i.test(
      combined
    ))
      return Response.json(
        {
          error: "One or more selected employees are already locked or downloaded in another bank batch"
        },
        { status: 409 }
      );
    const status = error instanceof RequestError ? error.status : 500;
    const message = error instanceof RequestError ? error.message : messages.at(-1) ?? "Unable to update payroll";
    if (status >= 500)
      console.error(
        "Payroll application action failed",
        message.split("\n")[0]
      );
    return Response.json({ error: message }, { status });
  }
}

// supabase/functions/payroll-api/generated/whatsapp-webhook.ts
var WEBHOOK_VERIFY_TOKEN = "joy_payroll_wa_webhook_secret_2026";
async function GET2(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}
async function POST2(request) {
  try {
    const body = await request.json();
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    if (!message) {
      return new Response("EVENT_RECEIVED", { status: 200 });
    }
    const fromPhone = formatWhatsAppPhone(String(message.from || ""));
    const buttonId = String(message.interactive?.button_reply?.id || message.button?.payload || "");
    const buttonTitle = String(
      message.interactive?.button_reply?.title || message.button?.text || ""
    ).trim().toLowerCase();
    const textBody = String(message.text?.body || "").trim().toLowerCase();
    const contextMsgId = String(message.context?.id || "");
    const isDoneSignal = buttonId.startsWith("task_complete_") || buttonTitle.includes("done") || buttonTitle.includes("complete") || textBody.includes("done") || textBody.includes("complete") || textBody.includes("finish") || textBody === "ok" || textBody === "yes" || textBody === "completed";
    const isAcceptSignal = buttonId.startsWith("task_accept_") || buttonTitle.includes("accept") || textBody === "accept" || textBody.includes("accepted") || textBody === "start" || textBody.includes("started");
    const db = getDb();
    const explicitTaskId = buttonId.startsWith("task_complete_") ? buttonId.replace("task_complete_", "") : buttonId.startsWith("task_accept_") ? buttonId.replace("task_accept_", "") : null;
    let matchedTask = null;
    if (explicitTaskId) {
      const [t] = await db.select().from(staffTasks).where(eq(staffTasks.id, explicitTaskId)).limit(1);
      matchedTask = t;
    }
    if (!matchedTask && contextMsgId) {
      const [t] = await db.select().from(staffTasks).where(eq(staffTasks.whatsappMessageId, contextMsgId)).limit(1);
      matchedTask = t;
    }
    if (!matchedTask) {
      const activeTasks = await db.select().from(staffTasks).where(
        and(
          inArray(staffTasks.status, ["pending", "in_progress"])
        )
      ).orderBy(desc(staffTasks.createdAt));
      matchedTask = activeTasks.find(
        (t) => formatWhatsAppPhone(t.assignedToPhone) === fromPhone
      );
    }
    if (matchedTask) {
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const displayTime = (/* @__PURE__ */ new Date()).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const superAdmins = await db.select().from(appUsers).where(eq(appUsers.role, "super_admin"));
      const adminPhone = superAdmins.find((a) => a.mobileNumber)?.mobileNumber || "919944399088";
      if (isDoneSignal) {
        await db.update(staffTasks).set({
          status: "completed",
          completedAt: now,
          completionNotes: `Reported via WhatsApp: "${message.text?.body || buttonTitle || "Completed"}"`,
          updatedAt: now
        }).where(eq(staffTasks.id, matchedTask.id));
        await sendWhatsAppTextMessage(
          fromPhone,
          `\u2705 *Task Marked Complete!*

Thank you, *${matchedTask.assignedToName}*. Task "*${matchedTask.title}*" has been recorded as completed in Joy HRMS.`
        );
        await sendTaskCompletedAlertWhatsApp(adminPhone, {
          title: matchedTask.title,
          assignedToName: matchedTask.assignedToName,
          completedAt: displayTime,
          completionNotes: `Reported via WhatsApp from +${fromPhone}`
        });
      } else if (isAcceptSignal) {
        await db.update(staffTasks).set({
          status: "in_progress",
          acceptedAt: now,
          updatedAt: now
        }).where(eq(staffTasks.id, matchedTask.id));
        await sendWhatsAppTextMessage(
          fromPhone,
          `\u{1F44D} *Task Accepted!*

Thank you, *${matchedTask.assignedToName}*. We have notified the Super Admin that you have seen and started working on *${matchedTask.title}*.

Tap *\u2705 Task Completed* when you are finished!`
        );
        await sendTaskAcceptedAlertWhatsApp(adminPhone, {
          title: matchedTask.title,
          assignedToName: matchedTask.assignedToName,
          acceptedAt: displayTime
        });
      }
    } else if (isAcceptSignal || isDoneSignal) {
      await sendWhatsAppTextMessage(
        fromPhone,
        `\u2139\uFE0F *Joy HRMS Notification*

No pending tasks currently assigned to your number (+${fromPhone}). Contact Super Admin if you need assistance.`
      );
    }
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return new Response("EVENT_RECEIVED", { status: 200 });
  }
}

// supabase/functions/payroll-api/redis-cache.ts
var DEFAULT_REDIS_URL = "https://cunning-kiwi-203450.upstash.io";
var DEFAULT_REDIS_TOKEN = "gQAAAAAAAxq6AAIgcDE0ODdkZjI3ZTliZGI0MzgwODRjYmRlZWNiNDY4OGU5Zg";
async function compressString(str) {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 8192) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 8192)));
  }
  return "gz:" + btoa(binary);
}
async function decompressString(rawVal) {
  if (!rawVal) return "";
  let str = rawVal;
  if (str.startsWith('"') && str.endsWith('"')) {
    try {
      str = JSON.parse(str);
    } catch {
    }
  }
  if (!str.startsWith("gz:")) return str;
  const base64 = str.slice(3);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}
var UpstashRedis = class {
  constructor(url, token) {
    const envUrl = typeof Deno !== "undefined" ? Deno.env.get("UPSTASH_REDIS_REST_URL") : typeof process !== "undefined" ? process.env.UPSTASH_REDIS_REST_URL : void 0;
    const envToken = typeof Deno !== "undefined" ? Deno.env.get("UPSTASH_REDIS_REST_TOKEN") : typeof process !== "undefined" ? process.env.UPSTASH_REDIS_REST_TOKEN : void 0;
    this.url = (url || envUrl || DEFAULT_REDIS_URL).replace(/\/+$/, "");
    this.token = token || envToken || DEFAULT_REDIS_TOKEN;
  }
  async get(key) {
    try {
      const res = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data.result !== "string") return null;
      try {
        const decompressed = await decompressString(data.result);
        return JSON.parse(decompressed);
      } catch {
        void this.del(key);
        return null;
      }
    } catch {
      return null;
    }
  }
  async set(key, value, exSeconds = 180) {
    try {
      const raw = typeof value === "string" ? value : JSON.stringify(value);
      const payload = await compressString(raw);
      if (payload.length > 95e4) return false;
      const res = await fetch(`${this.url}/set/${encodeURIComponent(key)}?ex=${exSeconds}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  async del(...keys) {
    try {
      if (!keys.length) return true;
      const res = await fetch(`${this.url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(keys.map((k) => ["DEL", k]))
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  async flushAppData() {
    try {
      const res = await fetch(`${this.url}/keys/joy_app_data*`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (Array.isArray(data.result) && data.result.length > 0) {
        await this.del(...data.result);
      }
      return true;
    } catch {
      return false;
    }
  }
};
var redis = new UpstashRedis();

// supabase/functions/payroll-api/index.ts
var projectUrl = Deno.env.get("SUPABASE_URL");
var secretKeyDictionary = Deno.env.get("SUPABASE_SECRET_KEYS");
var modernSecretKey = secretKeyDictionary ? JSON.parse(secretKeyDictionary).default : void 0;
var secretKey = modernSecretKey ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!projectUrl || !secretKey) {
  throw new Error("Supabase did not provide the secure server-only API secrets.");
}
var admin = createClient(projectUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var allowedOrigins = /* @__PURE__ */ new Set([
  "https://internalpayroll.joycorporatesolutions.com",
  "https://payroll.joycorporatesolutions.com",
  "https://joy-payroll.praveen-red-07.workers.dev",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  ...(Deno.env.get("APP_ORIGIN") ?? "").split(",").map((origin) => origin.trim()).filter(Boolean)
]);
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host.includes("joypeoplehr") || host.includes("joycorporatesolutions")) return true;
  } catch {
  }
  if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
  return false;
}
function responseHeaders(origin) {
  const allowed = origin && isAllowedOrigin(origin) ? origin : [...allowedOrigins][0];
  return {
    "access-control-allow-origin": allowed,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-retry-count, traceparent, tracestate, baggage",
    "access-control-max-age": "86400",
    "cache-control": "no-store",
    vary: "Origin"
  };
}
function jsonError(message, status, origin) {
  return Response.json(
    { error: message },
    { status, headers: responseHeaders(origin) }
  );
}
async function verifyIdentity(request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  const isConfirmed = Boolean(data?.user && (data.user.email_confirmed_at || data.user.confirmed_at || data.user.last_sign_in_at || data.user.id));
  if (error || !data?.user?.email || !isConfirmed) return null;
  const metadata = data.user.user_metadata ?? {};
  const candidate = metadata.full_name ?? metadata.name;
  const fullName = typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
  return {
    email: data.user.email.trim().toLowerCase(),
    fullName,
    displayName: fullName ?? data.user.email
  };
}
var index_default = {
  async fetch(request) {
    const origin = request.headers.get("origin");
    if (origin && !isAllowedOrigin(origin)) {
      return jsonError("This website is not permitted to access Joy Payroll.", 403, null);
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }
    if (!["GET", "POST"].includes(request.method)) {
      return jsonError("Unsupported request method.", 405, origin);
    }
    const url = new URL(request.url);
    const isWhatsAppWebhook = url.searchParams.get("webhook") === "whatsapp" || url.pathname.endsWith("/whatsapp-webhook");
    if (isWhatsAppWebhook) {
      if (request.method === "GET") {
        return GET2(request);
      }
      if (request.method === "POST") {
        const response = await POST2(request);
        try {
          await redis.flushAppData();
        } catch (e) {
          console.warn("Failed to flush redis on whatsapp webhook:", e);
        }
        return response;
      }
      return new Response("Method Not Allowed", { status: 405 });
    }
    try {
      const identity = await verifyIdentity(request);
      if (!identity) {
        return jsonError(
          "A verified Joy Payroll email and password are required.",
          401,
          origin
        );
      }
      if (request.method === "GET") {
        const skipCache = url.searchParams.has("fresh") || url.searchParams.has("t");
        if (!skipCache) {
          try {
            const cacheKey = `joy_app_data:${identity.email}`;
            const cached = await redis.get(cacheKey);
            if (cached && typeof cached === "object") {
              return Response.json(cached, {
                status: 200,
                headers: {
                  ...responseHeaders(origin),
                  "x-cache": "HIT"
                }
              });
            }
          } catch (e) {
            console.warn("Redis GET error:", e);
          }
        }
        const applicationResponse2 = await GET(identity);
        const headers2 = new Headers(applicationResponse2.headers);
        for (const [name, value] of Object.entries(responseHeaders(origin))) {
          headers2.set(name, value);
        }
        if (applicationResponse2.ok) {
          try {
            const payload = await applicationResponse2.clone().json();
            void redis.set(`joy_app_data:${identity.email}`, payload, 180);
          } catch {
          }
        }
        return new Response(applicationResponse2.body, {
          status: applicationResponse2.status,
          headers: headers2
        });
      }
      const applicationResponse = await POST(request, identity);
      if (applicationResponse.ok) {
        try {
          await redis.flushAppData();
        } catch (e) {
          console.warn("Failed to flush redis on mutation:", e);
        }
      }
      const headers = new Headers(applicationResponse.headers);
      for (const [name, value] of Object.entries(responseHeaders(origin))) {
        headers.set(name, value);
      }
      return new Response(applicationResponse.body, {
        status: applicationResponse.status,
        headers
      });
    } catch (error) {
      console.error(
        "Joy payroll API request failed:",
        error instanceof Error ? error.message : String(error)
      );
      return jsonError("Unable to complete the payroll request.", 500, origin);
    }
  }
};
export {
  index_default as default
};
