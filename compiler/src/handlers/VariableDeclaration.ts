import { LiteralValue, ObjectValue } from "../values";
import {
  THandler,
  es,
  TValueInstructions,
  IValue,
  IScope,
  IInstruction,
  EMutability,
} from "../types";
import { nodeName } from "../utils";
import { CompilerError } from "../CompilerError";
import { ValueOwner } from "../values/ValueOwner";
import { Compiler } from "../Compiler";

export const VariableDeclaration: THandler<null> = (
  c,
  scope,
  node: es.VariableDeclaration
) => {
  return c.handleMany(scope, node.declarations, child =>
    VariableDeclarator(c, scope, child, node.kind)
  );
};

export const VariableDeclarator: THandler<null> = (
  c,
  scope,
  node: es.VariableDeclarator,
  kind: "let" | "var" | "const" = "let"
) => {
  const [init, inst]: TValueInstructions<IValue | null> = node.init
    ? c.handleEval(scope, node.init)
    : [null, []];

  inst.push(...Declare(c, scope, node.id, kind, init)[1]);
  return [null, inst];
};

type TDeclareHandler<T extends es.Node> = (
  c: Compiler,
  scope: IScope,
  node: T,
  kind: "let" | "const" | "var",
  init: IValue | null
) => TValueInstructions<null>;

const Declare: TDeclareHandler<es.LVal> = (c, scope, node, kind, init) => {
  return c.handle(scope, node, () => {
    switch (node.type) {
      case "Identifier":
        return DeclareIdentifier(c, scope, node, kind, init);
      case "ArrayPattern":
        return DeclareArrayPattern(c, scope, node, kind, init);
      case "ObjectPattern":
        return DeclareObjectPattern(c, scope, node, kind, init);
      default:
        throw new CompilerError(
          `Unsupported declaration type: ${node.type}`,
          node
        );
    }
  }) as TValueInstructions<null>;
};
const DeclareIdentifier: TDeclareHandler<es.Identifier> = (
  c,
  scope,
  node,
  kind,
  init
) => {
  const { name: identifier } = node;
  const name = nodeName(node, !c.compactNames && identifier);
  if (kind === "const" && !init)
    throw new CompilerError("Constants must be initialized.", node);
  if (kind === "const" && init?.mutability === EMutability.constant) {
    const owner = new ValueOwner({
      scope,
      identifier,
      name,
      value: init,
      constant: true,
    });
    scope.set(owner);
    return [null, []];
  } else {
    const value = scope.make(identifier, name);
    const inst: IInstruction[] = [];
    if (init) {
      if (init.macro)
        throw new CompilerError("Macro values must be held by constants", node);

      inst.push(...value["="](scope, init)[1]);
    }
    if (kind === "const") value.mutability = EMutability.constant;
    return [null, inst];
  }
};

const DeclareArrayPattern: TDeclareHandler<es.ArrayPattern> = (
  c,
  scope,
  node,
  kind,
  init
) => {
  const { elements } = node;
  if (!(init instanceof ObjectValue))
    throw new CompilerError(
      "The value being destructured must be an object value"
    );

  const inst: IInstruction[] = [];
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    if (!element) continue;
    const val = init.data[i];

    if (!val)
      throw new CompilerError(
        `The target object does not have a value at index ${i}`,
        element
      );

    inst.push(...Declare(c, scope, element, kind, val)[1]);
  }
  return [null, inst];
};

const DeclareObjectPattern: TDeclareHandler<es.ObjectPattern> = (
  c,
  scope,
  node,
  kind,
  base
) => {
  if (!base)
    throw new CompilerError(
      "Cannot use object destructuring without an initializer",
      node
    );
  const { properties } = node;
  const [init, inst] = base.consume(scope);

  const propertiesInst = c.handleMany(scope, properties, prop => {
    if (prop.type === "RestElement")
      throw new CompilerError("The rest operator is not supported", prop);

    const { key, value } = prop;

    const keyInst: TValueInstructions =
      key.type === "Identifier" && !prop.computed
        ? [new LiteralValue(key.name), []]
        : c.handleConsume(scope, prop.key);

    const propInit = init.get(scope, keyInst[0]);

    const declarationInst = Declare(
      c,
      scope,
      value as es.LVal,
      kind,
      propInit[0]
    );

    return [null, [...keyInst[1], ...propInit[1], ...declarationInst[1]]];
  });

  return [null, [...inst, ...propertiesInst[1]]];
};
