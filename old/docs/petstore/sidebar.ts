import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "petstore/example-api",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "petstore/get-a-list-of-users",
          label: "Get a list of users",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "petstore/create-a-new-user",
          label: "Create a new user",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "petstore/get-a-user-by-id",
          label: "Get a user by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "petstore/update-a-user-by-id",
          label: "Update a user by ID",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "petstore/delete-a-user-by-id",
          label: "Delete a user by ID",
          className: "api-method delete",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
