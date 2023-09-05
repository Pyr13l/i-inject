# i-inject

A scoped injection-container intended for use in a Routed SPA, written in TypeScript.

## Concept

### Register stores with n-scopes

```
class Test {
 public static typeName = "Test";

}

// register(type: T, ...scopes[])
inject.register(Test, '/test/*', '/something/differen/test'
```

### Use the wildcard `'*'` to permit everything further "down" the current scope.

Leading to

```
inject.register(Test, '*');
```

being allways available

### Keep the `current-scope` in line with `window.location.pathname` using the `changeTo`-function

React example using react-router-dom:

```
const location = useLocation();

useEffect(() => {
    inject.changeTo(location.pathname)
}, [location])
```

### Enjoy accessing singleton instances from where you want, and only from there.

Instances and contained data will be dropped after a change to the `current-scope`, providing a particularly safe / clean working environment.

```
inject.register(Test, '/test/:id', '/something/differen/test'
inject.enter('/test/123');

expect(inject.get(Test)).toBeDefined();

inject.changeTo('/wont/be/active);

expect(inject.get(Test)).toBeUndefined();
```
