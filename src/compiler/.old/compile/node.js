const { NotImplement } = require('../error_static');
const { Meta } = require('./meta');
const { TString, TNumber, TVariable } = require('./expression');
const Coder = require('../packer/coder');
const { pn, production } = require('../def');

class Node {
    pack () { throw NotImplement('pack in ' + this.constructor.name) };
    serialize () { throw NotImplement ('serialize in ' + this.constructor.name)};
}

Node.ELEMENT_NODE = 1;
Node.VALUEABLE_NODE = 2;
Node.TEXT_NODE = 3;
Node.DEFINITION_NODE = 4;

//definition node
class DNode extends Node {
    constructor (name) {
        super();
        this.nodeType = Node.DEFINITION_NODE;
        this.children = [];
        this.parameters = {};
        this.nodeName = name;
    }

    set_param (name, default_value = null) {
        let p = name.indexOf(':');
        if (p !== -1) {
            let type = name.slice(p + 1);
            name = name.slice(0, p);
            this.parameters[name] = [default_value, type];
        } else {
            this.parameters[name] = [default_value];
        }
    }

    serialize (is_instance, indent) {
        let coder = new Coder(indent),
        has_param = Object.keys(this.parameters).length != 0,
        has_children = this.children.length != 0
        coder.add('new Renderer("' + this.nodeName + '", ');

        if (has_param) {
            coder.add('{');
            let first = true;
            for (let param in this.parameters) {
                let v = this.parameters[param];
                if (first) first = false;
                else coder.add(',');
                coder.add_newline();
                if (!production && v[1] !== undefined) {
                    coder.add_line(JSON.stringify(param + '.' + 'type') + ': '+ pn + 'types.' + v[1] + ',');
                }
                coder.add_line(JSON.stringify(param) + ': ', false);
                coder.add(v[0] === null ? 'null' : (v[0] instanceof Node) ? 
                    v[0].serialize('attr') : v[0]);
            }
            coder.add_newline();
            coder.add_line('}', false);            
        } else {
            coder.add('null');
        }
        coder.add(', ');
        if (has_children) {
            coder.add('[');
            let first = true;
            for (let child of this.children) {
                if (first) first = false;
                else coder.add(',');
                coder.add_newline();
                coder.add_line(child.serialize(is_instance, indent), false);
            }
            coder.add_newline();
            coder.add_line(']', false);
        } else {
            coder.add('null');
        }

        coder.add(');');

        return coder.toString();
    }
}

//element node
class ENode extends Node {
    constructor (name) {
        super();
        this.nodeType = Node.ELEMENT_NODE;
        this.children = [];
        this.nodeName = name;
        this.attributes = {};
    }

    set_param (name, value = null) {
        this.attributes[name] = value;
    }

    serialize (is_instance, indent) {
        let coder = new Coder(indent),
        has_attr = Object.keys(this.attributes).length != 0,
        has_children = this.children.length != 0;

        if (is_instance(this.nodeName)) {
            coder.add(pn + this.nodeName + '(', false);
        } else {
            coder.add('new Element("' + this.nodeName + '", ');
        }

        if (has_attr) {
            coder.add('{')
            let first = true;
            for (let attr in this.attributes) {
                let v = this.attributes[attr];
                if (first) first = false;
                else coder.add(',');
                coder.add_newline() ;   
                coder.add_line(attr + ': ', false);
                coder.add(v === null ? 'null' : v instanceof Node ? v.serialize('attr') : v);
            }
            coder.add_newline();
            coder.add_line('}', false);           
        } else {
            coder.add('null');
        }
        coder.add(', ');
        if (has_children) {
            coder.add('[');
            let first = true;
            for (let child of this.children) {
                if (first) first = false;
                else coder.add(',');
                coder.add_newline();
                coder.add_line(child.serialize(is_instance, indent), false);
            }
            coder.add_newline();
            coder.add_line(']', false);
        } else {
            coder.add('null');           
        }

        coder.add(')');

        return coder.toString();
    }
}

//text node 
class TNode extends Node {
    constructor (text) {
        super();
        this.nodeType = Node.TEXT_NODE;
        this.text = text;
    }
    //place_holder is just a place holder ^v^
    serialize (place_holder, indent = 0) {
        let coder = new Coder(indent);
        coder.add(this.text);
        return JSON.stringify(coder.toString());
    }
}

//valueable node
class VNode extends Node {
    constructor (tokens) {
        super();
        this.nodeType = Node.VALUEABLE_NODE;
        this.tokens = tokens;
    }

    serialize (type, indent = 0) {
        let coder = new Coder(indent), pure = true;
        if (type == 'attr')
            coder.add('new VAttr(function () { return ');            
        else if (type == 'val')
            coder.add('new Value(function () { return ');
        else 
            coder.add('new VText(function () { return ');

        for (let token of this.tokens) {
            if (token instanceof TVariable ||
                token instanceof TString ||
                token instanceof TNumber)
                token = token.serialize();
            else
                pure = false;
            coder.add(token);
        }
        coder.add('; }, ' + JSON.stringify(pure) + ')');
        return coder.toString();
    }
}

module.exports = { DNode, TNode, VNode, ENode };