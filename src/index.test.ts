import { test, describe, expect } from "@jest/globals";
import { InjectContainer } from ".";

class Foo {
  public static typeName = "Foo";
  public bar() {
    return true;
  }
}

class Fizz {
  public static typeName = "Fizz";
}

describe("Tests for Inject", () => {
  test("Register throws if you add the same class twice", () => {
    expect(() => {
      const injectContainer = new InjectContainer();
      injectContainer.register(Foo, "bar");
      injectContainer.register(Foo, "buzz");
    }).toThrow();
  });

  test("Register doesn't throw if two different classes are added", () => {
    expect(() => {
      const injectContainer = new InjectContainer();
      injectContainer.register(Foo, "bar");
      injectContainer.register(Fizz, "buzz");
    });
  });

  test("That requsting instances works", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "bar");
    injectContainer.enter("bar");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeDefined();
    expect(inst.bar()).toBeTruthy();
  });

  test("That you get the same refrence on second call", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "bar");
    injectContainer.enter("bar");

    const inst = injectContainer.get(Foo);
    const inst2 = injectContainer.get(Foo);

    expect(inst).toEqual(inst2);
  });

  test("That leaving a scope removes the instance", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "bar");
    injectContainer.enter("bar");

    const inst = injectContainer.get(Foo);

    expect(inst).toBeDefined();

    injectContainer.leave("bar");
    const inst3 = injectContainer.get(Foo);

    expect(inst3).toBeUndefined();
  });

  test("That scopes with different segment lenghts work", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "/asd/lol");
    injectContainer.enter("/asd");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeUndefined();
  });

  test("That scopes with different segment lenghts work MK2", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "/foo");
    injectContainer.enter("/foo/bar");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeUndefined();
  });

  test("That scopes with different segment lenghts work MK3", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "/foo/bar/bar");
    injectContainer.enter("/foo/bar/bar/bar");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeUndefined();
  });

  test("That scopes with different segment lenghts work when * are involved", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "/foo/*");
    injectContainer.enter("/foo");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeDefined();
  });

  test("That scopes with different segment lenghts work when * are involved MK2", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "/foo/*");
    injectContainer.enter("/foo/bar/bar/bar");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeDefined();
  });

  test("That scopes with different segment lenghts work when * are involved MK3", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "/foo/bar/*");
    injectContainer.enter("/foo");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeUndefined();
  });

  test("That scopes with different segment lenghts work when * are involved MK4", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "/foo/bar/bar/*");
    injectContainer.enter("/foo/bar/bar/bar");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeDefined();
  });

  test("That scopes work with :ids", () => {
    const injectContainer = new InjectContainer();
    injectContainer.register(Foo, "/foo/:id/bar");
    injectContainer.enter("/foo/712708ca-485c-11ee-be56-0242ac120002/bar");

    const inst = injectContainer.get(Foo);
    expect(inst).toBeDefined();
  });

  test("That changeTo works", () => {
    expect(() => {
      const injectContainer = new InjectContainer();
      injectContainer.register(Foo, "/foo/:id/bar");
      injectContainer.register(Fizz, "/fizz/buzz");

      injectContainer.enter("/fizz/buzz");
      const fizz = injectContainer.get(Fizz);
      expect(fizz).toBeDefined();

      injectContainer.changeTo("/foo/712708ca-485c-11ee-be56-0242ac120002/bar");

      const fizzAfterChange = injectContainer.get(Fizz);
      expect(fizzAfterChange).toBeUndefined();

      const foo = injectContainer.get(Foo);
      expect(foo).toBeDefined();
    });
  });

  test("That always active works", () => {
    expect(() => {
      const injectContainer = new InjectContainer();
      injectContainer.register(Foo, "*");

      injectContainer.enter("/Foo/bar");
      const foo = injectContainer.get(Foo);
      expect(foo).toBeDefined();
    });
  });
});
