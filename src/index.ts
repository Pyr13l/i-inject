const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ID_PLACEHOLDER = ":id";
const WILDCARD = "*";
export const ALLWAYS_ACTIVE = WILDCARD;

const splitAndSanitise = (value: string) =>
  value.split("/").filter((segment) => segment);

type InjectableClass<T extends new () => InstanceType<T>> =
  (new () => InstanceType<T>) & {
    typeName: string;
  };

interface InjectData<T extends InjectableClass<T>> {
  [key: string]: InjectDefinition<T>;
}

interface InjectDefinition<T extends InjectableClass<T>> {
  constructor: T;
  instance?: InstanceType<T>;
  scopes: string[];
}

const assertDefined = <T extends {}>(item: T | undefined): NonNullable<T> => {
  if (item) {
    return item;
  }

  throw new Error("Asserted value was undefined");
};

type IdPredicate = (value: string) => boolean;

const DEFAULT_ID_PREDICATES = [
  (value: string) => Boolean(Number(value)),
  (value: string) => UUID_REGEX.test(value),
];

const getDefaultIdPredicates = () => [...DEFAULT_ID_PREDICATES];

export class InjectContainer {
  /** @internal */
  private activeScopes: Set<string> = new Set([]);

  /** @internal */
  private definitions: InjectData<any> = {};

  /** @internal */
  private isId = (value: string) =>
    this.idPredicates.reduce((acc, pattern) => {
      if (acc) {
        return acc;
      }
      return pattern(value);
    }, false);

  /** @internal */
  private idPredicates: IdPredicate[] = [...DEFAULT_ID_PREDICATES];

  public register = <T extends InjectableClass<T>>(
    type: T,
    ...scopes: string[]
  ) => {
    if (this.definitions[type.typeName]) {
      throw new Error(`Store already registered! Store name: ${type.typeName}`);
    }
    this.definitions[type.typeName] = { constructor: type, scopes };
  };

  public get = <T extends InjectableClass<T>>(type: T): InstanceType<T> => {
    const definition = assertDefined(this.definitions[type.typeName]);
    if (!definition.instance && this.isAnyActive(definition.scopes)) {
      definition.instance = new definition.constructor();
      return definition.instance;
    }

    return definition.instance;
  };

  public changeTo = (newScope: string) => {
    this.activeScopes = new Set([newScope]);
    this.dropAllWithoutActiveScope();
  };

  public enter = (newScope: string) => {
    if (this.activeScopes.has(newScope)) {
      console.debug("Tried to enter enabled scope - ignoring");
      return;
    }

    this.activeScopes.add(newScope);
  };

  public leave = (oldScope: string) => {
    if (!this.activeScopes.has(oldScope)) {
      console.debug("Tried to leave Scope that wasn't present - ignoring");
      return;
    }

    this.activeScopes.delete(oldScope);

    this.dropAllWithoutActiveScope();
  };

  public addIdPredicate = (predicate: IdPredicate) => {
    this.idPredicates.push(predicate);
  };

  public resetPredicates = () => {
    this.idPredicates = getDefaultIdPredicates();
  };

  /** @internal */
  private dropAllWithoutActiveScope = () => {
    Object.values(this.definitions).forEach((definition) => {
      if (definition.instance && !this.isAnyActive(definition.scopes)) {
        definition.instance = undefined;
      }
    });
  };

  /** @internal */
  private isAnyActive = (scopesForStore: string[]) => {
    for (const scope of scopesForStore) {
      if (this.isScopeActive(scope)) {
        return true;
      }
    }

    return false;
  };

  /**
   * checks the supplied scope against the activeScopes
   * @argument scope e.g.: '/test/asd/:id'
   * @returns true if match was found else false
   * @internal
   */
  private isScopeActive = (scope: string) => {
    const scopeFromStore = splitAndSanitise(scope);

    return Array.from(this.activeScopes)
      .map((activeScope) => splitAndSanitise(activeScope))
      .filter(
        (activeScope) =>
          /*
          Scopes that are assigned to stores 
          need to end in a wildcard '*' 
          to be active deeper then they are specified

          (scopeFromStore = ["foo", "*"] & activeScope = ["foo", "bar", "fizz"]) => Keep!
          (scopeFromStore = ["foo"] & activeScope = ["foo", "bar", "fizz"]) => Can't be valid

          (scopeFromStore = ["foo, "bar", "fizz""] & activeScope = ["foo"]) => Can't be valid either
        */
          activeScope.length === scopeFromStore.length ||
          scopeFromStore[scopeFromStore.length - 1] === WILDCARD
      )
      .reduce((acc, activeScope) => {
        if (acc) {
          return true;
        }

        let result = false;
        try {
          for (let index = 0; index < scopeFromStore.length; index++) {
            const scopeSegmentFromStore = assertDefined(scopeFromStore[index]);

            if (scopeSegmentFromStore === WILDCARD) {
              /*
                We found a wildcard! 
                If this is our first round, scopeFromStore is "ALWAYS_ACTIVE".
                If not, all the steps behind us are valid.
                -> return true;
              */
              result = true;
              break;
            }

            const activeScopeSegment = assertDefined(activeScope[index]);

            if (activeScopeSegment === scopeSegmentFromStore) {
              result = true;
            } else if (
              scopeSegmentFromStore === ID_PLACEHOLDER &&
              this.isId(activeScopeSegment)
            ) {
              result = true;
            } else {
              result = false;
              break;
            }
          }
        } catch (e) {
          result = false;
        }

        return result;
      }, false);
  };
}

export const inject = new InjectContainer();
