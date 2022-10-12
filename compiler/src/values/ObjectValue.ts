import { CompilerError } from "../CompilerError";
import { MacroFunction } from "../macros";
import { operators } from "../operators";
import {
  EMutability,
  IOwnedValue,
  IScope,
  IValue,
  TOperatorMacroMap,
  TValueInstructions,
} from "../types";
import { LiteralValue } from "./LiteralValue";
import { VoidValue } from "./VoidValue";

export interface IObjectValueData extends TOperatorMacroMap {
  [k: string]: IValue | undefined;
  $get?: MacroFunction<IValue>;
  $eval?: MacroFunction<IValue>;
  $consume?: MacroFunction<IValue>;
}
export class ObjectValue extends VoidValue {
  mutability = EMutability.constant;
  macro = true;
  data: IObjectValueData;

  constructor(data: IObjectValueData = {}) {
    super();
    this.data = data;
  }

  static fromArray(
    items: IObjectValueData[keyof IObjectValueData][],
    intialData?: IObjectValueData
  ): ObjectValue {
    const data: IObjectValueData = {
      ...intialData,
      length: new LiteralValue(items.length),
    };
    items.forEach((item, i) => {
      if (item) data[i] = item;
    });
    return new ObjectValue(data);
  }

  typeof(): TValueInstructions {
    return [new LiteralValue("object"), []];
  }

  get(scope: IScope, key: LiteralValue): TValueInstructions {
    // avoids naming collisions with keys like
    // constructor or toString
    if (Object.prototype.hasOwnProperty.call(this.data, key.data)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const member = this.data[key.data]!;
      return [member, []];
    }
    const { $get } = this.data;
    if (!$get) throw new CompilerError("Cannot get undefined member.");
    return $get.call(scope, [key]);
  }

  eval(scope: IScope): TValueInstructions {
    const { $eval } = this.data;
    if (!$eval) return [this, []];
    return $eval.call(scope, []);
  }
  consume(scope: IScope): TValueInstructions {
    const { $consume } = this.data;
    if ($consume) return $consume.call(scope, []);
    const result = this.eval(scope);
    // required by typescript
    const res: IValue = result[0];
    res.ensureOwned();
    return result;
  }
  call(scope: IScope, args: IValue[]): TValueInstructions<IValue | null> {
    const { $call } = this.data;
    if (!$call) return super.call(scope, args);
    return $call.call(scope, args);
  }

  ensureOwned(): asserts this is IOwnedValue {}
}

for (const op of operators) {
  ObjectValue.prototype[op] = function (
    this: ObjectValue,
    ...args: [IScope, ...never[]]
  ) {
    const $ = this.data[`$${op}`];
    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unsafe-return
    if (!$) return (VoidValue.prototype[op] as Function).apply(this, args);
    const [scope, ...fnArgs] = args;
    return $.call(scope, fnArgs);
  } as never;
}
