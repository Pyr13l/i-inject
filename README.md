# i-inject

A multi-scope singleton injection-container intended for use in a Routed SPA, written in TypeScript.

- Lazy initialization of instances
- Automaticly drops stored instances if the scope changes to something they weren't intended for

## Usage

test-store.ts

```
class TestStore {
    public static typeName = "TestStore";

    // your code here
    ...
}

inject.register(TestStore, '/test/*', 'anther/route/:id/test', '/something/differen/test');

```

test-component.ts

```
const TestComponent = () => {
    const { myList, onAddNewItem } = inject.get(TestStore)

    const displayList = myList.map(iten => <div>{item}</div>);

    return (
        <div>
            {displayList}
            <button onClick={onAddNewItem}>Add New</button>
        </div>
    );
}
```

### Use the wildcard `'*'` to permit everything further "down" the current scope.

#### Example:

```
inject.register(TestStore, '/test/*');
```

Will be accessible in `/test/anything/goes` and `/test/13asd213-12asd1-11as1d3-a2s1d312asd/even/this`

#### A convenience export `const ALLWAYS_ACTIVE = '*'` is provided

leading to

```
inject.register(TestStore, ALLWAYS_ACTIVE)
```

### IDs

The `:id` placeholder supports `Numbers` and `UUID-4`

## SETUP

You can leave and enter scopes manually, but aside from specific cases (e.g. opening a modal /wizard) it's not advised.

To keep the `current-scope` in line with the url use the `changeTo`-function and add something like the following to the initialization part of you application.

```
// The following code assumes you are using a Hash-Router
// If this is not the case, don't use the `window.location.hash` leveraged below

const sanitize = (arg: string) => arg.substring(1).split("&")[0];

const beforeLocationChange = new CustomEvent("pushstate", {
  detail: {},
  bubbles: true,
  cancelable: true,
  composed: false,
});

const pushState = history.pushState;
history.pushState = function () {
  pushState.apply(
    history,
    arguments as unknown as [
      data: any,
      unused: string,
      url?: string | URL | null | undefined
    ]
  );
  window.dispatchEvent(beforeLocationChange);
};

window.addEventListener("pushstate", () => {
  inject.changeTo(sanitize(window.location.hash));
});

window.addEventListener("popstate", () => {
  inject.changeTo(sanitize(window.location.hash));
});

// enter initial scope (also enables deep reloads)
inject.enter(sanitize(window.location.hash));
```

If you are wondering about the `CustomEvent`, the `history.pushState` function does currently not trigger an event on its own.

### And you are done - Enjoy accessing singleton instances from where you want, and only from there.

Instances and contained data will be dropped after a change to the `current-scope`, providing a particularly safe / clean working environment.

```
inject.register(Test, '/test/:id', '/something/differen/test')
inject.enter('/test/123');

expect(inject.get(Test)).toBeDefined();

inject.changeTo('/wont/be/active);

expect(inject.get(Test)).toBeUndefined();
```
