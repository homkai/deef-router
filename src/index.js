/**
 * Created by baidu on 17/6/27.
 */
import isString from 'lodash/isString';
import isFunction from 'lodash/isFunction';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

import matchPath from './matchPath';

const ruleList = [];

const on = ({history, compareMatchKeys = ['path', 'params', 'url']}) => (rule, {onMatch, onBreakMatch}, key) => {
    // 一个rule只生效一次
    let ruleKey = isString(key) && key;
    if (!ruleKey) {
        if (isString(rule)) {
            ruleKey = rule;
        }
        else if (rule.path) {
            ruleKey = JSON.stringify(rule);
        }
        else if (isString(rule.pathname) || !isFunction(rule.search)) {
            ruleKey = `${rule.pathname}${getSearchKey(rule.search)}`;
        }
    }
    if (!ruleKey) {
        throw new Error('When rule is function must pass a globally unique `key` in the 3nd param');
    }

    if (ruleList.some(item => item.ruleKey === ruleKey)) {
        return;
    }

    // 放到ruleList，并立即触发匹配
    ruleList.push({
        rule,
        ruleKey,
        callbacks: {onMatch, onBreakMatch}
    });
    onHistoryChange(history.location);

    // 只建立一次history.listen
    ruleList.length === 1 && history.listen(onHistoryChange);

    // 监听history change
    function onHistoryChange(location) {
        const execList = [];
        ruleList.forEach(item => {
            const {rule, ruleKey, callbacks: {onMatch, onBreakMatch}} = item;
            const match = matchRule(location, rule);
            if (match && !isEqual(pick(item.lastMatch, compareMatchKeys), pick(match, compareMatchKeys))) {
                onMatch && execList.push({ruleKey, onMatch: onMatch.bind(null, match, item.lastMatch)});
                item.lastMatch = match;
            }
            else if (!match && item.lastMatch !== null) {
                onBreakMatch && execList.push({ruleKey, onBreakMatch: onBreakMatch.bind(null, item.lastMatch)});
                item.lastMatch = null;
            }
            (item.lastMatch !== null) && (item.lastMatch = match);
        });
        // 先执行onBreakMatch，执行顺序按注册顺序从后到早
        [...execList].reverse().forEach(item => {
            item.onBreakMatch && item.onBreakMatch();
        });
        // 再执行onMatch
        execList.forEach(item => {
            item.onMatch && item.onMatch();
        });
    }
};

export default ({history}) => {
    return {
        on: on({history})
    };
};

function matchRule(location, rule) {
    if (isString(rule.pathname) || rule.search && !isFunction(rule.search)) {
        let ret = {
            path: rule.pathname,
            params: {}
        };
        if (rule.pathname && rule.pathname !== location.pathname) {
            ret = null;
        }
        if (ret && rule.search) {
            const searchRule = isString(rule.search) ? parseSearch(rule.search) : rule.search;
            const searchParams = parseSearch(location.search);
            Object.keys(searchRule).every(key => {
                const valRule = searchRule[key];
                if ((isString(valRule) && valRule !== searchParams[key])
                    || (isFunction(valRule) && !valRule(searchParams[key]))) {
                    return false;
                }
                ret.params[key] = searchParams[key];
                return true;
            }) || (ret = null);
        }
        return ret;
    }
    if (isString(rule) || isString(rule.path)) {
        return matchPath(location.pathname || location.path, rule);
    }
    if (isFunction(rule)) {
        return rule(location);
    }
}

function parseSearch(str) {
    const ret = {};
    str.replace(/(^\?|&$)/g, '').split('&').forEach(item => {
        const [key, value] = item.split('=');
        ret[key] = value;
    });
    return ret;
}

function getSearchKey(val) {
    return val && '?' + (
            isString(val)
                ? val.replace(/(^\?|&$)/g, '')
                : Object.keys(val).join('&')
        );
}