# deef-router
针对deef的思想设计的router，用于模块的初始化路由注册，提供history change时的callback环境。


# Usages
```js
// app.js
import deef from 'deef';
import createHashHistory from 'history/createHashHistory';
import deefRouter from './router';

export const app = deef();
export const connect = app.connect;
export const history = createHashHistory();
export const router = deefRouter({history});

// handler.js
import {router} from 'app';
router.on(rule, {onMatch, onBreakMatch}[, key]);
```


## rule
1、express style path
```js
const rule = '/:module/:page';
const rule = {path: '/', exact: true};
```

2、match pathname or search params
```js
const rule = {pathname: '/Test'};
const rule = {pathname: '/TodoEntry', search: '?from=Test'};
const rule = {pathname: '/TodoEntry', search: {form: 'Test'}};
const rule = {pathname: '/TodoEntry', search: {form: location.search.form => {}}};
```
*location.search是'?form=Test&otherKey=value'也会match上{search: '?form=Test'}*

3、function match
```js
const rule = ({pathname, search}) => {};
```
*return null or plain object, must pass key param*


## onMatch(match, lastMatch) match the rule
如针对rule '/Todo/:filter?'

location 从 /Test 到 /Todo/all时触发，此时无lastMatch

location 从 /Todo/all 到 /Todo/active时触发，此时有lastMatch
```js
router.on('/:module', {
    onMatch({params: {module}}) {
        //do something with *module*
    }
});
router.on({
        pathname: '/TodoEntry',
        search: {form: 'Test'}
    }, {
    onMatch({pathname, search: {form}}) {
        //do something with *form*
    }
});
```
*lastMatch意味着是在这同一个rule内，location的切换*

## onBreakMatch(lastMatch) 从match到mismatch时触发
如针对rule '/Todo/:filter'

location 从 /Todo/active 到 /Test时触发


## key
deef-router会根据key来保证同一个路由rule只注册一次（once on）

当rule不是function时，不是必须要传key的，会根据rule的特征自动生成唯一的key

当然，你也可以在任何调用的地方指定一个全局唯一的key来实现特殊逻辑，比如允许针对同一个rule注册两套路由规则
