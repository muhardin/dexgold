import { Container, Contracts, Providers } from "@arkecosystem/core-kernel";
import Boom from "@hapi/boom";
import Hapi from "@hapi/hapi";

import { Resource } from "../interfaces";

@Container.injectable()
export class Controller {
    @Container.inject(Container.Identifiers.Application)
    protected readonly app!: Contracts.Kernel.Application;

    @Container.inject(Container.Identifiers.PluginConfiguration)
    @Container.tagged("plugin", "@arkecosystem/core-api")
    protected readonly apiConfiguration!: Providers.PluginConfiguration;

    protected getPagination(request: Hapi.Request): Contracts.Search.Pagination {
        const pagination = {
            offset: (request.query.page - 1) * request.query.limit || 0,
            limit: request.query.limit || 100,
        };

        if (request.query.offset) {
            pagination.offset = request.query.offset;
        }

        return pagination;
    }

    protected getOrdering(request: Hapi.Request): Contracts.Search.Ordering {
        if (request.query.orderBy) {
            return request.query.orderBy.split(",");
        } else {
            return [];
        }
    }

    protected getCriteria(
        request: Hapi.Request,
        excludes = ["page", "limit", "offset", "orderBy", "transform"],
    ): unknown {
        const criteria = {};
        for (const [key, value] of Object.entries(request.query)) {
            if (excludes.includes(key) === false) {
                criteria[key] = value;
            }
        }
        return criteria;
    }

    protected getListingPage(request: Hapi.Request): Contracts.Search.ListPage {
        const pagination = {
            offset: (request.query.page - 1) * request.query.limit || 0,
            limit: request.query.limit || 100,
        };

        if (request.query.offset) {
            pagination.offset = request.query.offset;
        }

        return pagination;
    }

    protected getListingOrder(request: Hapi.Request): Contracts.Search.ListOrder {
        if (!request.query.orderBy) {
            return [];
        }

        return request.query.orderBy.split(",").map((s: string) => ({
            property: s.split(":")[0],
            direction: s.split(":")[1] === "desc" ? "desc" : "asc",
        }));
    }

    protected getListingOptions(): Contracts.Search.ListOptions {
        const options: Contracts.Search.ListOptions = {
            estimateTotalCount: this.apiConfiguration.getOptional<boolean>("options.estimateTotalCount", true),
        };

        return options;
    }

    protected respondWithResource(data, transformer, transform = true): any {
        if (!data) {
            return Boom.notFound();
        }

        return { data: this.toResource(data, transformer, transform) };
    }

    protected respondWithCollection(data, transformer, transform = true): object {
        return {
            data: this.toCollection(data, transformer, transform),
        };
    }

    protected toResource(data, transformer, transform = true): object {
        return transform
            ? this.app.resolve<Resource>(transformer).transform(data)
            : this.app.resolve<Resource>(transformer).raw(data);
    }

    /* istanbul ignore next */
    protected toCollection<T>(data: T[], transformer, transform = true): object {
        return data.map((item) => this.toResource(item, transformer, transform));
    }

    protected toPagination<T>(data: Contracts.Search.ListResult<T>, transformer, transform = true): object {
        return {
            results: this.toCollection(data.rows, transformer, transform),
            totalCount: data.count,
            meta: { totalCountIsEstimate: data.countIsEstimate },
        };
    }
}
