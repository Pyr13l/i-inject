const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ALLWAYS_ACTIVE = "*";

const splitAndSanitise = (value: string) => {
  return value
    .split("/")
    .filter((segment) => segment !== "#" && isNaN(Number(segment)));
};

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

export class InjectContainer {
  private activeScopes: Set<string> = new Set([]);
  private definition: InjectData<any> = {};
  private isId = (value: string) => UUID_REGEX.test(value);

  public register = <T extends InjectableClass<T>>(
    type: T,
    ...scopes: string[]
  ) => {
    if (this.definition[type.typeName]) {
      throw new Error(`Store already registered! Store name: ${type.typeName}`);
    }
    this.definition[type.typeName] = { constructor: type, scopes };
  };

  public get = <T extends InjectableClass<T>>(type: T): InstanceType<T> => {
    const definition = assertDefined(this.definition[type.typeName]);
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

  private dropAllWithoutActiveScope = () => {
    Object.values(this.definition).forEach((definition) => {
      if (definition.instance && !this.isAnyActive(definition.scopes)) {
        definition.instance = undefined;
      }
    });
  };

  private isAnyActive = (scopes: string[]) => {
    for (const scope of scopes) {
      if (this.compareAgainstActiveScope(scope)) {
        return true;
      }
    }

    return false;
  };

  /*
   * const storeData = ['/foo/bar','/test', '/test/asd', '/test/asd/:id']
   *
   */

  private compareAgainstActiveScope = (storeData: string) => {
    const scopeFromStore = splitAndSanitise(storeData);

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
          //
          activeScope.length === scopeFromStore.length ||
          scopeFromStore[scopeFromStore.length - 1] === "*"
      )
      .reduce((acc, activeScope) => {
        if (acc) {
          return true;
        }

        let result = false;
        try {
          for (let index = 0; index < scopeFromStore.length; index++) {
            const scopeSegmentFromStore = assertDefined(scopeFromStore[index]);

            if (scopeSegmentFromStore === "*") {
              /*
                We found a wildcard! 
                If this is our first round, scopeFromStore is "ALWAYS_ACTIVE".
                If not, all the steps behind us are valid, because we break on false
                -> return true;
              */
              result = true;
              break;
            }

            const activeScopeSegment = assertDefined(activeScope[index]);

            if (activeScopeSegment === scopeSegmentFromStore) {
              result = true;
            } else if (
              scopeSegmentFromStore === ":id" &&
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
